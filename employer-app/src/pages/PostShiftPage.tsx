import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  DollarSign,
  Home,
  Loader,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { apiClient } from "../services/api";

type LocationType = "client_home" | "facility" | "other";
type ScheduleType = "one_time" | "recurring";
type Urgency = "standard" | "urgent";

type ShiftFormData = {
  shiftTitle: string;
  serviceType: string;
  caregiverType: string;
  careRecipientName: string;
  scheduleType: ScheduleType;
  startDate: string;
  startTime: string;
  endTime: string;
  locationType: LocationType;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  hourlyRate: string;
  numberOfCaregivers: string;
  requirements: string[];
  responsibilities: string;
  notes: string;
  contactName: string;
  contactPhone: string;
  urgency: Urgency;
};

type ShiftPayload = {
  title: string;
  serviceType: string;
  caregiverType: string;
  careRecipientName?: string;
  scheduleType: ScheduleType;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  location: {
    type: LocationType;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  pay: {
    hourlyRate: number;
    currency: "USD";
  };
  numberOfCaregivers: number;
  requirements: string[];
  responsibilities: string;
  notes?: string;
  contact: {
    name: string;
    phone: string;
  };
  urgency: Urgency;
  status: "open";
};

const serviceOptions = [
  "Companion Care",
  "Personal Care",
  "Household Support",
  "Mobility Assistance",
  "Medication Reminders",
  "Dementia Care",
  "Post-Surgery Care",
  "Respite Care",
];

const caregiverTypeOptions = ["Companion", "PCA", "HHA", "CNA", "Homemaker", "Respite Worker"];

const requirementOptions = [
  "CPR / First Aid",
  "Dementia experience",
  "Hoyer lift experience",
  "Valid driver license",
  "Own transportation",
  "Weekend availability",
  "Overnight availability",
  "Non-smoker preferred",
];

const initialFormData: ShiftFormData = {
  shiftTitle: "",
  serviceType: "",
  caregiverType: "",
  careRecipientName: "",
  scheduleType: "one_time",
  startDate: "",
  startTime: "",
  endTime: "",
  locationType: "client_home",
  address: "",
  city: "",
  state: "MA",
  zipCode: "",
  hourlyRate: "35",
  numberOfCaregivers: "1",
  requirements: [],
  responsibilities: "",
  notes: "",
  contactName: "",
  contactPhone: "",
  urgency: "standard",
};

const inputClass =
  "w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#c08530]";

function buildShiftPayload(formData: ShiftFormData): ShiftPayload {
  return {
    title: formData.shiftTitle.trim(),
    serviceType: formData.serviceType,
    caregiverType: formData.caregiverType,
    careRecipientName: formData.careRecipientName.trim() || undefined,
    scheduleType: formData.scheduleType,
    startDate: formData.startDate,
    endDate: formData.startDate,
    startTime: formData.startTime,
    endTime: formData.endTime,
    location: {
      type: formData.locationType,
      address: formData.address.trim(),
      city: formData.city.trim(),
      state: formData.state,
      zipCode: formData.zipCode.trim(),
    },
    pay: {
      hourlyRate: Number(formData.hourlyRate),
      currency: "USD",
    },
    numberOfCaregivers: Number(formData.numberOfCaregivers),
    requirements: formData.requirements,
    responsibilities: formData.responsibilities.trim(),
    notes: formData.notes.trim() || undefined,
    contact: {
      name: formData.contactName.trim(),
      phone: formData.contactPhone.trim(),
    },
    urgency: formData.urgency,
    status: "open",
  };
}

export function PostShiftPage() {
  const [formData, setFormData] = useState<ShiftFormData>(initialFormData);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successPayload, setSuccessPayload] = useState<ShiftPayload | null>(null);

  const previewSummary = useMemo(() => {
    const locationParts = [formData.city, formData.state].filter(Boolean).join(", ");

    return {
      title: formData.shiftTitle || "New caregiver shift",
      service: formData.serviceType || "Service not selected",
      date: formData.startDate || "Date not selected",
      time:
        formData.startTime && formData.endTime
          ? `${formData.startTime} - ${formData.endTime}`
          : "Time not selected",
      rate: formData.hourlyRate ? `$${formData.hourlyRate}/hr` : "Rate not set",
      location: locationParts || "Location not set",
    };
  }, [formData]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setSuccessPayload(null);
  };

  const toggleRequirement = (requirement: string) => {
    setFormData((current) => ({
      ...current,
      requirements: current.requirements.includes(requirement)
        ? current.requirements.filter((item) => item !== requirement)
        : [...current.requirements, requirement],
    }));
    setSuccessPayload(null);
  };

  const validateForm = () => {
    if (!formData.shiftTitle.trim()) {
      return "Please add a shift title.";
    }

    if (!formData.serviceType) {
      return "Please select the service type.";
    }

    if (!formData.caregiverType) {
      return "Please select the caregiver type.";
    }

    if (!formData.startDate || !formData.startTime || !formData.endTime) {
      return "Please choose the date, start time, and end time.";
    }

    if (formData.startTime >= formData.endTime) {
      return "End time must be later than start time.";
    }

    if (!formData.address.trim() || !formData.city.trim() || !formData.zipCode.trim()) {
      return "Please complete the shift location.";
    }

    if (!formData.hourlyRate || Number(formData.hourlyRate) <= 0) {
      return "Please enter a valid hourly rate.";
    }

    if (!formData.numberOfCaregivers || Number(formData.numberOfCaregivers) <= 0) {
      return "Please enter how many caregivers are needed.";
    }

    if (!formData.responsibilities.trim()) {
      return "Please describe the main duties for this shift.";
    }

    if (!formData.contactName.trim() || !formData.contactPhone.trim()) {
      return "Please add the shift contact name and phone number.";
    }

    return "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = buildShiftPayload(formData);
    const isApiSubmitEnabled = import.meta.env.VITE_ENABLE_BOOKING_SUBMIT === "true";

    setIsLoading(true);

    try {
      if (isApiSubmitEnabled) {
        await apiClient.createShift(payload);
      }

      setSuccessPayload(payload);
    } catch (err: any) {
      setError(err.response?.data?.error || "Unable to post this shift. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3726] to-[#1a5a3f] p-4">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="rounded-lg bg-white p-6 shadow-xl md:p-8">
            <div className="mb-8">
              <div className="mb-2 flex items-center gap-2">
                <ClipboardList className="h-8 w-8 text-[#c08530]" />
                <h1 className="text-3xl font-bold text-[#0b3726]">Post a Shift</h1>
              </div>
              <p className="text-gray-600">
                Create a caregiver staffing request for Elite Bridge caregivers and support staff.
              </p>
            </div>

            {error && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {successPayload && (
              <div className="mb-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-700" />
                <div>
                  <p className="font-semibold text-green-800">Shift form is ready.</p>
                  <p className="text-sm text-green-700">
                    The payload is prepared for the bookings API. Turn on VITE_ENABLE_BOOKING_SUBMIT
                    when the backend POST /bookings endpoint is ready.
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <section>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#0b3726]">
                  <Users className="h-5 w-5 text-[#c08530]" />
                  Shift Details
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Shift Title</label>
                    <input
                      type="text"
                      name="shiftTitle"
                      value={formData.shiftTitle}
                      onChange={handleChange}
                      placeholder="Example: Evening companion care in Lowell"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Service Type</label>
                    <select
                      name="serviceType"
                      value={formData.serviceType}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Select service</option>
                      {serviceOptions.map((service) => (
                        <option key={service} value={service}>
                          {service}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Caregiver Type</label>
                    <select
                      name="caregiverType"
                      value={formData.caregiverType}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="">Select caregiver type</option>
                      {caregiverTypeOptions.map((caregiverType) => (
                        <option key={caregiverType} value={caregiverType}>
                          {caregiverType}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Care Recipient Name <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      name="careRecipientName"
                      value={formData.careRecipientName}
                      onChange={handleChange}
                      placeholder="Client or resident name"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Urgency</label>
                    <select
                      name="urgency"
                      value={formData.urgency}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="standard">Standard</option>
                      <option value="urgent">Urgent / same day</option>
                    </select>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#0b3726]">
                  <CalendarDays className="h-5 w-5 text-[#c08530]" />
                  Schedule
                </h2>

                <div className="grid gap-4 md:grid-cols-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Schedule Type</label>
                    <select
                      name="scheduleType"
                      value={formData.scheduleType}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="one_time">One-time shift</option>
                      <option value="recurring">Recurring shift</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Date</label>
                    <input
                      type="date"
                      name="startDate"
                      value={formData.startDate}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Start Time</label>
                    <input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">End Time</label>
                    <input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#0b3726]">
                  <MapPin className="h-5 w-5 text-[#c08530]" />
                  Location
                </h2>

                <div className="grid gap-4 md:grid-cols-6">
                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Location Type</label>
                    <select
                      name="locationType"
                      value={formData.locationType}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="client_home">Client home</option>
                      <option value="facility">Facility</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="md:col-span-4">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Street Address</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="123 Main Street"
                      className={inputClass}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Lowell"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">State</label>
                    <select
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      className={inputClass}
                    >
                      <option value="MA">MA</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="mb-2 block text-sm font-medium text-gray-700">Zip Code</label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleChange}
                      placeholder="01852"
                      className={inputClass}
                    />
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#0b3726]">
                  <DollarSign className="h-5 w-5 text-[#c08530]" />
                  Pay & Requirements
                </h2>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Hourly Rate</label>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      name="hourlyRate"
                      value={formData.hourlyRate}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Number of Caregivers
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="numberOfCaregivers"
                      value={formData.numberOfCaregivers}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="mb-3 block text-sm font-medium text-gray-700">
                    Requirements <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="grid gap-3 md:grid-cols-2">
                    {requirementOptions.map((requirement) => (
                      <label key={requirement} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.requirements.includes(requirement)}
                          onChange={() => toggleRequirement(requirement)}
                          className="h-4 w-4 rounded text-[#c08530] focus:ring-2 focus:ring-[#c08530]"
                        />
                        <span className="text-sm text-gray-700">{requirement}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              <section>
                <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-[#0b3726]">
                  <ShieldCheck className="h-5 w-5 text-[#c08530]" />
                  Duties & Contact
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">Main Duties</label>
                    <textarea
                      name="responsibilities"
                      value={formData.responsibilities}
                      onChange={handleChange}
                      rows={4}
                      placeholder="Describe care needs, household support, mobility help, companionship, reminders, or other duties."
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Extra Notes <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleChange}
                      rows={3}
                      placeholder="Parking instructions, pets in home, language preference, or other details."
                      className={inputClass}
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Shift Contact</label>
                      <input
                        type="text"
                        name="contactName"
                        value={formData.contactName}
                        onChange={handleChange}
                        placeholder="Contact person"
                        className={inputClass}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700">Contact Phone</label>
                      <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        placeholder="(978) 555-0123"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#c08530] py-3 font-semibold text-white transition-colors hover:bg-[#b0743f] disabled:opacity-50"
              >
                {isLoading && <Loader className="h-4 w-4 animate-spin" />}
                {isLoading ? "Preparing Shift..." : "Post Shift"}
              </button>
            </form>
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg bg-white p-6 shadow-xl">
              <h2 className="mb-4 text-lg font-semibold text-[#0b3726]">Shift Preview</h2>
              <div className="space-y-4 text-sm text-gray-700">
                <div className="flex items-start gap-3">
                  <ClipboardList className="mt-0.5 h-5 w-5 text-[#c08530]" />
                  <div>
                    <p className="font-semibold text-gray-900">{previewSummary.title}</p>
                    <p>{previewSummary.service}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-5 w-5 text-[#c08530]" />
                  <div>
                    <p className="font-semibold text-gray-900">{previewSummary.date}</p>
                    <p>{previewSummary.time}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-[#c08530]" />
                  <div>
                    <p className="font-semibold text-gray-900">{previewSummary.location}</p>
                    <p>{formData.locationType.replace("_", " ")}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <DollarSign className="mt-0.5 h-5 w-5 text-[#c08530]" />
                  <div>
                    <p className="font-semibold text-gray-900">{previewSummary.rate}</p>
                    <p>{formData.numberOfCaregivers} caregiver(s) needed</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-[#c08530]/30 bg-[#fff8ef] p-6">
              <div className="mb-3 flex items-center gap-2">
                <Home className="h-5 w-5 text-[#c08530]" />
                <h3 className="font-semibold text-[#0b3726]">Backend-ready fields</h3>
              </div>
              <p className="text-sm text-gray-700">
                This form prepares a booking payload with service, schedule, location, pay,
                requirements, duties, contact, urgency, and status fields.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
