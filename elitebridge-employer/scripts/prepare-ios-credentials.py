import base64
import json
import os
import pathlib
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


def p12_serial(password: str) -> str:
    cert_pem = subprocess.check_output(
        [
            "openssl",
            "pkcs12",
            "-in",
            P12_PATH,
            "-clcerts",
            "-nokeys",
            "-passin",
            f"pass:{password}",
        ],
        stderr=subprocess.STDOUT,
    )
    serial_output = subprocess.check_output(
        ["openssl", "x509", "-noout", "-serial"],
        input=cert_pem,
        stderr=subprocess.STDOUT,
    ).decode("utf-8")
    return normalize_serial(serial_output.split("=", 1)[1])


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

    local_serial = p12_serial(p12_password)

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

    credentials = {
        "ios": {
            "provisioningProfilePath": PROFILE_PATH,
            "distributionCertificate": {
                "path": P12_PATH,
                "password": p12_password,
            },
        }
    }
    pathlib.Path("credentials.json").write_text(json.dumps(credentials), encoding="utf-8")
    print(
        f"Prepared Employer App Store provisioning profile using Apple certificate serial {local_serial}."
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
