import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft, CheckCircle2, Loader } from "lucide-react";
import { apiClient } from "../services/api";

type FormData = {
  title: string;
  serviceType: string;
  caregiverType: string;
  startDate: string;
  startTime: string;
  endTime: string;
  locationType: "client_home" | "facility" | "other";
  address: string;
  city: string;
  state: string;
  zipCode: string;
  hourlyRate: string;
  numberOfCaregivers: string;
  responsibilities: string;
  contactName: string;
  contactPhone: string;
  urgency: "standard" | "urgent";
  notes: string;
};

const initialFormData: FormData = {
  title: "",
  serviceType: "Companion Care",
  caregiverType: "Companion",
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
  responsibilities: "",
  contactName: "",
  contactPhone: "",
  urgency: "standard",
  notes: "",
};

const inputClass = "w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#c08530]";

export function PostShiftApiPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
    setSuccess(false);
  };

  const validate = () => {
    if (!formData.title.trim()) return "Please enter a shift title.";
    if (!formData.startDate || !formData.startTime || !formData.endTime) return "Please select date, start time, and end time.";
    if (formData.startTime >= formData.endTime) return "End time must be later than start time.";
    if (!formData.address.trim() || !formData.city.trim() || !formData.zipCode.trim()) return "Please complete the shift location.";
    if (!formData.responsibilities.trim()) return "Please describe the main duties.";
    if (!formData.contactName.trim() || !formData.contactPhone.trim()) return "Please add a contact person and phone number.";
    return "";
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.createShift({
        title: formData.title.trim(),
        serviceType: formData.serviceType,
        caregiverType: formData.caregiverType,
        scheduleType: "one_time",
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
        requirements: [],
        responsibilities: formData.responsibilities.trim(),
        notes: formData.notes.trim() || undefined,
        contact: {
          name: formData.contactName.trim(),
          phone: formData.contactPhone.trim(),
        },
        urgency: formData.urgency,
        status: "open",
      });

      setSuccess(true);
      setFormData(initialFormData);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Unable to post shift.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3726] to-[#1a5a3f] p-4">
      <div className="mx-auto max-w-3xl">
        <Link to="/dashboard" className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-white hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to dashboard
        </Link>

        <div className="rounded-lg bg-white p-6 shadow-xl md:p-8">
          <h1 className="text-3xl font-bold text-[#0b3726]">Post a Shift</h1>
          <p className="mt-2 text-gray-600">Create a real shift post that saves to the employer dashboard.</p>

          {error && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" /> {error}
            </div>
          )}

          {success && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0" /> Shift posted successfully. It now appears on your dashboard.
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Shift Title</label>
              <input name="title" value={formData.title} onChange={handleChange} placeholder="Evening companion care in Lowell" className={inputClass} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Service Type</label>
                <select name="serviceType" value={formData.serviceType} onChange={handleChange} className={inputClass}>
                  <option>Companion Care</option>
                  <option>Personal Care</option>
                  <option>Household Support</option>
                  <option>Mobility Assistance</option>
                  <option>Medication Reminders</option>
                  <option>Dementia Care</option>
                  <option>Post-Surgery Care</option>
                  <option>Respite Care</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Caregiver Type</label>
                <select name="caregiverType" value={formData.caregiverType} onChange={handleChange} className={inputClass}>
                  <option>Companion</option>
                  <option>PCA</option>
                  <option>HHA</option>
                  <option>CNA</option>
                  <option>Homemaker</option>
                  <option>Respite Worker</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Date</label>
                <input type="date" name="startDate" value={formData.startDate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Start Time</label>
                <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">End Time</label>
                <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Street Address</label>
              <input name="address" value={formData.address} onChange={handleChange} placeholder="123 Main Street" className={inputClass} />
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
                <input name="city" value={formData.city} onChange={handleChange} placeholder="Lowell" className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">State</label>
                <select name="state" value={formData.state} onChange={handleChange} className={inputClass}>
                  <option value="MA">MA</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Zip</label>
                <input name="zipCode" value={formData.zipCode} onChange={handleChange} placeholder="01852" className={inputClass} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Hourly Rate</label>
                <input type="number" min="1" step="0.01" name="hourlyRate" value={formData.hourlyRate} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Caregivers Needed</label>
                <input type="number" min="1" name="numberOfCaregivers" value={formData.numberOfCaregivers} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Urgency</label>
                <select name="urgency" value={formData.urgency} onChange={handleChange} className={inputClass}>
                  <option value="standard">Standard</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Main Duties</label>
              <textarea name="responsibilities" value={formData.responsibilities} onChange={handleChange} rows={4} className={inputClass} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Contact Name</label>
                <input name="contactName" value={formData.contactName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Contact Phone</label>
                <input name="contactPhone" value={formData.contactPhone} onChange={handleChange} className={inputClass} />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Notes</label>
              <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className={inputClass} />
            </div>

            <div className="flex flex-col gap-3 md:flex-row">
              <button type="submit" disabled={isLoading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#c08530] py-3 font-semibold text-white hover:bg-[#b0743f] disabled:opacity-50">
                {isLoading && <Loader className="h-4 w-4 animate-spin" />}
                {isLoading ? "Posting..." : "Post Shift"}
              </button>
              <button type="button" onClick={() => navigate("/dashboard")} className="rounded-lg border border-gray-300 px-5 py-3 font-semibold text-gray-700 hover:bg-gray-50">
                View Dashboard
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
