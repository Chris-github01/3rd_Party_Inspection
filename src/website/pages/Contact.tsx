import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { useState } from 'react';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    projectType: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Contact form submission is not yet connected to backend. This is UI-only for now.');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="bg-[#0B0F14]">
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block px-4 py-1.5 bg-[#121821] border border-slate-800 rounded-full mb-6">
              <span className="text-sm font-semibold text-[#C8102E]">CONTACT</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-[#F5F7FA] mb-6">
              Request Technical<br />Assessment
            </h1>
            <p className="text-xl text-[#D1D5DB] max-w-3xl mx-auto leading-relaxed">
              Contact P&R Consulting to discuss independent inspection support for your protective coatings, intumescent coatings, or passive fire protection project.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="bg-[#121821] border border-slate-800 rounded-xl p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-[#F5F7FA] mb-2">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0B0F14] border border-slate-700 rounded-lg text-[#F5F7FA] focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] outline-none transition-colors"
                      placeholder="Your full name"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#F5F7FA] mb-2">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0B0F14] border border-slate-700 rounded-lg text-[#F5F7FA] focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] outline-none transition-colors"
                      placeholder="your.email@company.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-[#F5F7FA] mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0B0F14] border border-slate-700 rounded-lg text-[#F5F7FA] focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] outline-none transition-colors"
                      placeholder="021 123 4567"
                    />
                  </div>
                  <div>
                    <label htmlFor="company" className="block text-sm font-medium text-[#F5F7FA] mb-2">
                      Company / Organisation
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-[#0B0F14] border border-slate-700 rounded-lg text-[#F5F7FA] focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] outline-none transition-colors"
                      placeholder="Your company"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label htmlFor="projectType" className="block text-sm font-medium text-[#F5F7FA] mb-2">
                    Project Type
                  </label>
                  <select
                    id="projectType"
                    name="projectType"
                    value={formData.projectType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-[#0B0F14] border border-slate-700 rounded-lg text-[#F5F7FA] focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] outline-none transition-colors"
                  >
                    <option value="">Select project type</option>
                    <option value="protective-coatings">Protective Coatings Inspection</option>
                    <option value="intumescent">Intumescent Coatings Inspection</option>
                    <option value="passive-fire">Passive Fire Protection Inspection</option>
                    <option value="qa-verification">QA Verification Support</option>
                    <option value="other">Other / General Enquiry</option>
                  </select>
                </div>

                <div className="mb-6">
                  <label htmlFor="message" className="block text-sm font-medium text-[#F5F7FA] mb-2">
                    Project Details / Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    value={formData.message}
                    onChange={handleChange}
                    rows={6}
                    className="w-full px-4 py-3 bg-[#0B0F14] border border-slate-700 rounded-lg text-[#F5F7FA] focus:border-[#C8102E] focus:ring-1 focus:ring-[#C8102E] outline-none transition-colors resize-none"
                    placeholder="Please provide details about your project, inspection requirements, timeline, and location..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-[#C8102E] hover:bg-[#A60E25] text-white font-semibold rounded-lg transition-colors"
                >
                  <Send className="w-5 h-5" />
                  Submit Request
                </button>

                <p className="mt-4 text-sm text-[#D1D5DB] text-center">
                  Your information will be used solely for responding to your enquiry.
                </p>
              </form>
            </div>

            <div className="space-y-6">
              <div className="bg-[#121821] border border-slate-800 rounded-xl p-6">
                <h2 className="text-xl font-bold text-[#F5F7FA] mb-6">Contact Information</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#F5F7FA] mb-1">Coverage Area</h3>
                      <p className="text-sm text-[#D1D5DB]">
                        Nationwide service across<br />all regions of New Zealand
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#C8102E] to-[#A60E25] rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#F5F7FA] mb-1">Email</h3>
                      <p className="text-sm text-[#D1D5DB]">
                        Contact via form or<br />direct email enquiry
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-[#121821] to-[#0B0F14] border border-[#C8102E] rounded-xl p-6">
                <h2 className="text-lg font-bold text-[#F5F7FA] mb-4">Response Time</h2>
                <p className="text-sm text-[#D1D5DB] mb-4">
                  We aim to respond to all technical assessment requests within one business day. Project mobilisation timeframes are discussed based on project requirements and location.
                </p>
                <div className="text-xs text-[#D1D5DB]">
                  For urgent inspection requirements, please indicate this in your message.
                </div>
              </div>

              <div className="bg-[#121821] border border-slate-800 rounded-xl p-6">
                <h2 className="text-lg font-bold text-[#F5F7FA] mb-4">Service Areas</h2>
                <ul className="space-y-2 text-sm text-[#D1D5DB]">
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full mt-1.5 flex-shrink-0" />
                    Auckland & Northland
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full mt-1.5 flex-shrink-0" />
                    Waikato & Bay of Plenty
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full mt-1.5 flex-shrink-0" />
                    Wellington & Lower North Island
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 bg-[#C8102E] rounded-full mt-1.5 flex-shrink-0" />
                    South Island (All Regions)
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
