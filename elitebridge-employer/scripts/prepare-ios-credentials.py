import base64
import json
import os
import pathlib
import plistlib
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

import jwt

API_ROOT = "https://api.appstoreconnect.apple.com"
BUNDLE_IDENTIFIER = "com.app.elitebridgeemployer"
P12_PATH = "/tmp/elitebridge-dist.p12"
COMPAT_P12_PATH = "/tmp/elitebridge-dist-compatible.p12"
PROFILE_PATH = "/tmp/elitebridge-employer.mobileprovision"
KEY_PATH = "/tmp/AuthKey.p8"


def required(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def normalize_serial(value: str) -> str:
    cleaned = value.replace(":", "").strip().upper().lstrip("0")
    return cleaned or "0"


def api_request(token: str, method: str, path: str, payload=None):
    data = None
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(API_ROOT + path, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Apple API {method} {path} failed with HTTP {exc.code}: {detail}") from exc


def p12_serial(path: str, password: str, legacy: bool = False) -> str:
    command = ["openssl", "pkcs12"]
    if legacy:
        command.append("-legacy")
    command.extend(
        [
            "-in",
            path,
            "-clcerts",
            "-nokeys",
            "-passin",
            f"pass:{password}",
        ]
    )
    cert_pem = subprocess.check_output(command, stderr=subprocess.STDOUT)
    serial_output = subprocess.check_output(
        ["openssl", "x509", "-noout", "-serial"],
        input=cert_pem,
        stderr=subprocess.STDOUT,
    ).decode("utf-8")
    return normalize_serial(serial_output.split("=", 1)[1])


def make_macos_compatible_p12(password: str) -> None:
    cert_path = "/tmp/elitebridge-dist-cert.pem"
    key_path = "/tmp/elitebridge-dist-key.pem"

    subprocess.check_call(
        [
            "openssl",
            "pkcs12",
            "-in",
            P12_PATH,
            "-clcerts",
            "-nokeys",
            "-passin",
            f"pass:{password}",
            "-out",
            cert_path,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    subprocess.check_call(
        [
            "openssl",
            "pkcs12",
            "-in",
            P12_PATH,
            "-nocerts",
            "-nodes",
            "-passin",
            f"pass:{password}",
            "-out",
            key_path,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    if not pathlib.Path(key_path).stat().st_size:
        raise RuntimeError("The distribution PKCS#12 does not contain a private key.")

    # EAS imports the distribution identity into a macOS keychain. Re-export
    # the same certificate/private key using the broadly supported legacy
    # PKCS#12 ciphers. OpenSSL 3 requires -legacy when reading this format.
    subprocess.check_call(
        [
            "openssl",
            "pkcs12",
            "-export",
            "-legacy",
            "-inkey",
            key_path,
            "-in",
            cert_path,
            "-out",
            COMPAT_P12_PATH,
            "-passout",
            f"pass:{password}",
            "-name",
            "Elite Bridge Distribution",
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )


def ensure_push_capability(token: str, bundle_id: str) -> None:
    capability_path = f"/v1/bundleIds/{bundle_id}/bundleIdCapabilities?limit=100"
    capabilities = api_request(token, "GET", capability_path).get("data", [])
    if any(item.get("attributes", {}).get("capabilityType") == "PUSH_NOTIFICATIONS" for item in capabilities):
        return

    payload = {
        "data": {
            "type": "bundleIdCapabilities",
            "attributes": {"capabilityType": "PUSH_NOTIFICATIONS"},
            "relationships": {
                "bundleId": {"data": {"type": "bundleIds", "id": bundle_id}}
            },
        }
    }
    api_request(token, "POST", "/v1/bundleIdCapabilities", payload)
    print("Enabled Push Notifications for the Employer bundle identifier.")


def verify_push_entitlement(profile_path: str) -> None:
    decoded_path = "/tmp/elitebridge-employer-profile.plist"
    subprocess.check_call(
        [
            "openssl", "smime", "-verify", "-inform", "DER", "-noverify",
            "-in", profile_path, "-out", decoded_path,
        ],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    profile = plistlib.loads(pathlib.Path(decoded_path).read_bytes())
    if "aps-environment" not in profile.get("Entitlements", {}):
        raise RuntimeError("Apple provisioning profile is missing the aps-environment push entitlement.")


def main():
    issuer_id = required("EXPO_ASC_ISSUER_ID")
    key_id = required("EXPO_ASC_KEY_ID")
    p12_password = required("P12_PASSWORD")
    key_text = pathlib.Path(KEY_PATH).read_text(encoding="utf-8")

    now = int(time.time())
    token = jwt.encode(
        {"iss": issuer_id, "iat": now, "exp": now + 1100, "aud": "appstoreconnect-v1"},
        key_text,
        algorithm="ES256",
        headers={"kid": key_id, "typ": "JWT"},
    )

    local_serial = p12_serial(P12_PATH, p12_password)
    make_macos_compatible_p12(p12_password)
    compatible_serial = p12_serial(COMPAT_P12_PATH, p12_password, legacy=True)
    if compatible_serial != local_serial:
        raise RuntimeError("Repacked distribution certificate serial does not match the source certificate.")

    cert_query = urllib.parse.urlencode({
        "limit": "200",
        "fields[certificates]": "serialNumber,certificateType,expirationDate,displayName,activated",
    })
    certificates = api_request(token, "GET", f"/v1/certificates?{cert_query}")["data"]
    certificate = next(
        (
            item
            for item in certificates
            if normalize_serial(item.get("attributes", {}).get("serialNumber", "")) == local_serial
            and item.get("attributes", {}).get("activated", True)
        ),
        None,
    )
    if not certificate:
        available = [
            {
                "serial": item.get("attributes", {}).get("serialNumber"),
                "type": item.get("attributes", {}).get("certificateType"),
                "expires": item.get("attributes", {}).get("expirationDate"),
            }
            for item in certificates
        ]
        raise RuntimeError(
            "The GitHub BUILD_CERTIFICATE_BASE64 secret does not match an active Apple certificate. "
            f"Local serial: {local_serial}. Active certificate metadata: {available}"
        )

    bundle_query = urllib.parse.urlencode({"filter[identifier]": BUNDLE_IDENTIFIER, "limit": "10"})
    bundle_data = api_request(token, "GET", f"/v1/bundleIds?{bundle_query}")["data"]
    if not bundle_data:
        raise RuntimeError(
            f"Apple Developer does not have the registered bundle identifier {BUNDLE_IDENTIFIER}."
        )
    bundle_id = bundle_data[0]["id"]
    ensure_push_capability(token, bundle_id)

    profile_name = f"Elite Bridge Employer App Store {int(time.time())}"
    payload = {
        "data": {
            "type": "profiles",
            "attributes": {"name": profile_name, "profileType": "IOS_APP_STORE"},
            "relationships": {
                "bundleId": {"data": {"type": "bundleIds", "id": bundle_id}},
                "certificates": {
                    "data": [{"type": "certificates", "id": certificate["id"]}]
                },
            },
        }
    }
    profile = api_request(token, "POST", "/v1/profiles", payload)["data"]
    profile_content = profile.get("attributes", {}).get("profileContent")
    if not profile_content:
        raise RuntimeError("Apple created the profile but did not return profileContent.")
    pathlib.Path(PROFILE_PATH).write_bytes(base64.b64decode(profile_content))
    verify_push_entitlement(PROFILE_PATH)

    credentials = {
        "ios": {
            "provisioningProfilePath": PROFILE_PATH,
            "distributionCertificate": {
                "path": COMPAT_P12_PATH,
                "password": p12_password,
            },
        }
    }
    pathlib.Path("credentials.json").write_text(json.dumps(credentials), encoding="utf-8")
    print(
        f"Prepared Employer App Store provisioning profile using Apple certificate serial {local_serial} and macOS-compatible PKCS#12 packaging."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
