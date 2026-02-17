import { useSearchParams } from 'react-router-dom';

export default function Welcome() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get('name') || '';
  const companyname = searchParams.get('companyname') || '';

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-slate-800 mb-4">
          Thank You {decodeURIComponent(name || '')} for Registering with SwiftBIM!
        </h1>
        <p className="text-slate-600 mb-6">
          We are excited to welcome you and {decodeURIComponent(companyname || '')} to JIFFY, your go-to platform
          for Digital Office. Your registration is complete and you are now part of our community.
        </p>
        <p className="text-slate-700 font-medium mb-2">To get started, explore the many features we offer:</p>
        <ul className="text-left text-slate-600 space-y-2 mb-6 list-disc list-inside">
          <li>Access exclusive content tailored just for you.</li>
          <li>Connect with like-minded individuals and share your experiences.</li>
          <li>Stay updated with the latest news and trends.</li>
          <li>Join upcoming events and workshops.</li>
        </ul>
        <p className="text-slate-600">
          Feel free to{' '}
          <a href="mailto:info@jiffy.mineit.tech" className="text-indigo-600 hover:underline">
            contact us
          </a>{' '}
          if you have any questions or need assistance.
        </p>
      </div>
    </div>
  );
}
