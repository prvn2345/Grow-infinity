"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "../../../../lib/config";

export default function TeacherSetup() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    qualifications: "",
    experience: "",
    location: "",
    hourlyFee: "",
    teachingMode: '["Online"]',
    subjects: '["Math"]'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem("token");

    const fd = new FormData();
    Object.entries(formData).forEach(([key, val]) => fd.append(key, val));
    // File uploads omitted for simplicity in this basic setup
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/teachers/profile`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: fd
      });

      if (res.ok) router.push("/dashboard/teacher");
      else alert("Setup failed");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Complete Teacher Profile</h1>
      <form onSubmit={handleSubmit} className="space-y-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-xl">
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Full Name" required onChange={e => setFormData({...formData, fullName: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Experience (years)" type="number" required onChange={e => setFormData({...formData, experience: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Location" required onChange={e => setFormData({...formData, location: e.target.value})} />
        <input className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400" placeholder="Hourly Fee (INR)" type="number" required onChange={e => setFormData({...formData, hourlyFee: e.target.value})} />
        <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white p-3 rounded-xl font-bold transition shadow-lg shadow-orange-600/10 cursor-pointer">Save Profile</button>
      </form>
    </div>
  );
}
