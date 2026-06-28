import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-iiml-cream flex items-center justify-center p-4">
      <div className="text-center">
        <ShieldOff className="mx-auto text-iiml-red mb-4" size={48} />
        <h1 className="text-2xl font-bold text-iiml-navy">Access Denied</h1>
        <p className="text-gray-500 mt-2">You don't have permission to view this page.</p>
        <Link to="/login" className="inline-block mt-6 px-6 py-2.5 bg-iiml-navy text-white rounded-lg font-medium">
          Back to Login
        </Link>
      </div>
    </div>
  );
}
