import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiClient } from "../services/api";
import { Briefcase, DollarSign, Calendar, AlertCircle, Loader, Plus, X } from "lucide-react";

export function ProfileSetupPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    bio: "",
    hourlyRate: "",
    yearsExperience: "",
    specialties: [] as string[],
    certifications: [] as string[],
  });
  const [newSpecialty, setNewSpecialty] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const specialtyOptions = [
    "Companion Care",
    "Personal Care",
    "Household Support",
    "Mobility Assistance",
    "Medication Reminders",
    "Dementia Care",
    "Alzheimer's Care",
    "Post-Surgery Care",
  ];

  const certificationOptions = [
    "CPR Certified",
    "First Aid Certified",
    "CNA (Certified Nursing Assistant)",
    "HHA (Home Health Aide)",
    "Dementia Care Certification",
    "Alzheimer's Certification",
  ];

  const handleAddSpecialty = () => {
    if (newSpecialty && !formData.specialties.includes(newSpecialty)) {
      setFormData((prev) => ({
        ...prev,
        specialties: [...prev.specialties, newSpecialty],
      }));
      setNewSpecialty("");
    }
  };

  const handleRemoveSpecialty = (specialty: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.filter((s) => s !== specialty),
    }));
  };

  const handleAddCertification = () => {
    if (newCertification && !formData.certifications.includes(newCertification)) {
      setFormData((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification],
      }));
      setNewCertification("");
    }
  };

  const handleRemoveCertification = (cert: string) => {
    setFormData((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.hourlyRate) {
      setError("Hourly rate is required");
      return;
    }

    if (formData.specialties.length === 0) {
      setError("Please select at least one specialty");
      return;
    }

    setIsLoading(true);

    try {
      await apiClient.updateCaregiverProfile(user?.id || 0, {
        bio: formData.bio,
        hourlyRate: parseFloat(formData.hourlyRate),
        yearsExperience: parseInt(formData.yearsExperience) || 0,
        specialties: formData.specialties,
        certifications: formData.certifications,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b3726] to-[#1a5a3f] p-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-xl p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#0b3726] mb-2">Complete Your Profile</h1>
          <p className="text-gray-600">Help employers find the right caregiver for their needs</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              About You
            </label>
            <textarea
              value={formData.bio}
              onChange={(e) => setFormData((prev) => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell employers about your experience, personality, and what makes you a great caregiver..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c08530]"
            />
          </div>

          {/* Hourly Rate & Experience */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Hourly Rate
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.hourlyRate}
                onChange={(e) => setFormData((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                placeholder="25.00"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c08530]"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4 inline mr-1" />
                Years of Experience
              </label>
              <input
                type="number"
                min="0"
                value={formData.yearsExperience}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, yearsExperience: e.target.value }))
                }
                placeholder="5"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c08530]"
              />
            </div>
          </div>

          {/* Specialties */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Briefcase className="w-4 h-4 inline mr-1" />
              Specialties
            </label>
            <div className="flex gap-2 mb-3">
              <select
                value={newSpecialty}
                onChange={(e) => setNewSpecialty(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c08530]"
              >
                <option value="">Select a specialty</option>
                {specialtyOptions
                  .filter((s) => !formData.specialties.includes(s))
                  .map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddSpecialty}
                className="bg-[#c08530] hover:bg-[#b0743f] text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.specialties.map((specialty) => (
                <div
                  key={specialty}
                  className="bg-[#0b3726] text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                >
                  {specialty}
                  <button
                    type="button"
                    onClick={() => handleRemoveSpecialty(specialty)}
                    className="hover:bg-white hover:text-[#0b3726] rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Certifications */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Certifications
            </label>
            <div className="flex gap-2 mb-3">
              <select
                value={newCertification}
                onChange={(e) => setNewCertification(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c08530]"
              >
                <option value="">Select a certification</option>
                {certificationOptions
                  .filter((c) => !formData.certifications.includes(c))
                  .map((cert) => (
                    <option key={cert} value={cert}>
                      {cert}
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddCertification}
                className="bg-[#c08530] hover:bg-[#b0743f] text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.certifications.map((cert) => (
                <div
                  key={cert}
                  className="bg-[#0b3726] text-white px-3 py-1 rounded-full flex items-center gap-2 text-sm"
                >
                  {cert}
                  <button
                    type="button"
                    onClick={() => handleRemoveCertification(cert)}
                    className="hover:bg-white hover:text-[#0b3726] rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#c08530] hover:bg-[#b0743f] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader className="w-4 h-4 animate-spin" />}
            {isLoading ? "Saving Profile..." : "Complete Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
