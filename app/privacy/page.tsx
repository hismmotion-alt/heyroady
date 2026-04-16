import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'Privacy Policy — Roady',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#ffffff', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <Navbar />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-extrabold mb-2" style={{ color: '#1B2D45' }}>Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-12">Last updated: April 15, 2025</p>

        <div className="prose prose-gray max-w-none" style={{ color: '#374151' }}>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>1. Information We Collect</h2>
            <p className="mb-3 leading-relaxed">When you use Roady, we may collect the following information:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li><strong>Account information</strong> — your name, email address, and profile photo when you sign in with Google.</li>
              <li><strong>Trip data</strong> — starting locations, destinations, and trip preferences you enter when planning a trip.</li>
              <li><strong>Saved trips</strong> — trip itineraries you choose to save to your account.</li>
              <li><strong>Usage data</strong> — pages visited and features used, collected anonymously to improve the service.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>2. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>To generate personalized road trip itineraries using AI.</li>
              <li>To save and display your trip history in your account.</li>
              <li>To improve and maintain the Roady service.</li>
              <li>To communicate with you about your account or service updates.</li>
            </ul>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>3. Third-Party Services</h2>
            <p className="leading-relaxed mb-3">Roady uses the following third-party services:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li><strong>Supabase</strong> — for authentication and data storage.</li>
              <li><strong>Mapbox</strong> — for address autocomplete and map display.</li>
              <li><strong>Anthropic (Claude AI)</strong> — to generate trip suggestions. Your location inputs are sent to generate itineraries.</li>
            </ul>
            <p className="leading-relaxed mt-3">Each of these services has its own privacy policy. We do not sell your data to any third party.</p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>4. Data Storage & Security</h2>
            <p className="leading-relaxed">Your data is stored securely via Supabase. We take reasonable measures to protect your information but cannot guarantee absolute security over internet transmission.</p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>5. Your Rights</h2>
            <p className="leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed">
              <li>Access the personal data we hold about you.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Stop using the service at any time.</li>
            </ul>
            <p className="leading-relaxed mt-3">To request data deletion, contact us at the email below.</p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>6. Cookies</h2>
            <p className="leading-relaxed">Roady uses cookies solely for authentication purposes (to keep you signed in). We do not use tracking or advertising cookies.</p>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold mb-3" style={{ color: '#1B2D45' }}>7. Contact</h2>
            <p className="leading-relaxed">If you have questions about this policy, please contact us at <a href="mailto:hismmotion@gmail.com" className="font-semibold" style={{ color: '#46a302' }}>hismmotion@gmail.com</a>.</p>
          </section>

        </div>
      </main>
    </div>
  );
}
