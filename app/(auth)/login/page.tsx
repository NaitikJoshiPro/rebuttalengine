'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { signIn } from 'next-auth/react';
import { Eye, EyeOff, Shield } from 'lucide-react';

const loginSchema = z.object({
  orgSlug: z.string().min(1, 'Organization slug is required'),
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setAuthError(null);
    setIsSubmitting(true);
    try {
      const result = await signIn('credentials', {
        email: data.email,
        password: data.password,
        orgSlug: data.orgSlug,
        redirectTo: '/dashboard',
        redirect: false,
      });
      if (result?.error) {
        setAuthError('Invalid credentials. Check your organization, email, and password.');
      } else if (result?.url) {
        window.location.href = result.url;
      }
    } catch {
      setAuthError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
        {/* Grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(184,149,58,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(184,149,58,0.045) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
          }}
        />

        {/* Top: brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-9 h-9 bg-gold-500 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-white"
              style={{ fontSize: 13, fontWeight: 800, letterSpacing: 2 }}
            >
              REBUTTAL ENGINE
            </span>
          </div>

          <div className="gold-divider" />

          <h1
            className="text-white leading-tight"
            style={{ fontSize: 36, fontWeight: 900, lineHeight: 1.1 }}
          >
            Win every
            <br />
            <span className="text-gold-400">chargeback</span>
            <br />
            dispute.
          </h1>

          <p className="text-navy-400 mt-6" style={{ fontSize: 14, lineHeight: 1.7 }}>
            Generate bank-ready rebuttal letters in seconds.
            <br />
            Protect your revenue with precision.
          </p>
        </div>

        {/* Bottom: stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-6 border-t border-navy-800 pt-8">
          {[
            { value: '94%', label: 'Win Rate' },
            { value: '<60s', label: 'Per Rebuttal' },
            { value: '$0', label: 'Lost Revenue' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-gold-400" style={{ fontSize: 22, fontWeight: 900 }}>
                {stat.value}
              </div>
              <div className="text-navy-400 mt-0.5" style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-gold-500 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span
              className="text-navy-900"
              style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2 }}
            >
              REBUTTAL ENGINE
            </span>
          </div>

          <p className="section-label mb-1">Secure Access</p>
          <h2 className="text-navy-900 mb-2" style={{ fontSize: 24, fontWeight: 900 }}>
            Sign in
          </h2>
          <p className="text-gray-400 mb-8" style={{ fontSize: 13 }}>
            Enter your organization and credentials below.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
            {/* Org Slug */}
            <div>
              <label htmlFor="orgSlug" className="form-label">
                Organization Slug
                <span className="form-required">*</span>
              </label>
              <input
                id="orgSlug"
                type="text"
                placeholder="your-company"
                autoComplete="organization"
                className={`form-input${errors.orgSlug ? ' error' : ''}`}
                {...register('orgSlug')}
              />
              {errors.orgSlug && (
                <p className="form-error">{errors.orgSlug.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="form-label">
                Email
                <span className="form-required">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@company.com"
                autoComplete="email"
                className={`form-input${errors.email ? ' error' : ''}`}
                {...register('email')}
              />
              {errors.email && (
                <p className="form-error">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="form-label">
                Password
                <span className="form-required">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`form-input pr-11${errors.password ? ' error' : ''}`}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-navy-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">{errors.password.message}</p>
              )}
            </div>

            {/* Auth error */}
            {authError && (
              <div
                className="border border-red-200 bg-red-50 px-4 py-3"
                role="alert"
              >
                <p className="text-red-600" style={{ fontSize: 12, fontWeight: 600 }}>
                  {authError}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-gray-300 text-center mt-8" style={{ fontSize: 11 }}>
            Need access?{' '}
            <a href="mailto:support@rebuttalengine.com" className="text-gold-500 hover:text-gold-400 transition-colors">
              Contact your administrator
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
