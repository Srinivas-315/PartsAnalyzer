'use client'; // ← Add this line at the top

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Landing() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary to-blue-700">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="text-center mb-8">
            <div className="bg-primary rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <i className="fas fa-cube text-white text-2xl"></i>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">AM Feasibility Platform</h1>
            <p className="text-gray-600 mt-2">Additive Manufacturing Analysis</p>
          </div>

          <div className="space-y-4">
            <Button
              onClick={() => window.location.href = "/api/login"}
              className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition duration-200"
            >
              Sign In to Continue
            </Button>

            <p className="text-center text-sm text-gray-600">
              Sign in to access the AM feasibility analysis platform
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
