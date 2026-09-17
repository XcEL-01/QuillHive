import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { contactEmail } from '@/lib/contact';
import { useT } from '@/lib/i18n';
import { BackButton } from '@/components/ui/BackButton';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const email = contactEmail();
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/support/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || data.error || 'Could not send your message.');
      setIsSent(true);
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <BackButton />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">{t("legal.contact.title", "Contact Us")}</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t("legal.contact.intro", "Questions, feedback, or just want to say hello? We'd love to hear from you.")}
        </p>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder={t("legal.contact.name", "Your name")}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  required
                />
                <input
                  type="email"
                  placeholder={t("legal.contact.email", "Your email")}
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <input
                type="text"
                placeholder={t("legal.contact.subject", "Subject")}
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required
              />
              <textarea
                rows={5}
                placeholder={t("legal.contact.message", "Your message...")}
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                required
              />
              <button
                type="submit"
                className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
              >
                {isSubmitting ? t("legal.contact.sending", "Sending...") : t("legal.contact.send", "Send Message")}
              </button>
              {isSent && (
                <div className="p-3 bg-green-100 text-green-700 rounded-lg text-center">
                  {t("legal.contact.sent", "Thanks! We'll get back to you soon.")}
                </div>
              )}
              {error && <div className="p-3 bg-red-100 text-red-700 rounded-lg text-center">{error}</div>}
            </form>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">{t("legal.contact.emailLabel", "Email")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <a href={`mailto:${email}`} className="hover:underline">{email}</a>
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">{t("legal.contact.responseTime", "Response Time")}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{t("legal.contact.responseTimeValue", "Usually within 48 hours")}</p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
