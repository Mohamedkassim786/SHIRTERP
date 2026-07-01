import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';


import { Label } from '@/components/ui/label';
import api from '@/api/axios';
import { useAuthStore } from '@/store/auth';

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const setAuth = useAuthStore((state) => state.setAuth);

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  });

  const rememberMe = watch('rememberMe');

  const [isDemoClicked, setIsDemoClicked] = useState(false);

  const fillDemoCredentials = () => {
    setValue('email', 'admin@erp.com');
    setValue('password', 'admin');
    setIsDemoClicked(true);
    setTimeout(() => setIsDemoClicked(false), 300);
  };

  const onSubmit = async (data: LoginFormValues) => {
    setServerError('');
    try {
      const startTime = Date.now();
      const response = await api.post('/auth/login', {
        email: data.email.trim(),
        password: data.password.trim()
      });
      const elapsed = Date.now() - startTime;
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed));

      setAuth(response.data.user, response.data.token);
      setIsSuccess(true);
      setTimeout(() => onSuccess(), 900);
    } catch (err: any) {
      setServerError(err.response?.data?.message || 'Invalid email or password');
    }
  };

  const container: any = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } }
  };
  const item: any = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="w-full max-w-[400px] mx-auto"
    >
      {/* Header */}
      <motion.div variants={item} className="mb-8">
        <h1 className="text-[2rem] font-bold text-slate-900 leading-tight">Sign in</h1>
        <p className="text-slate-500 text-base mt-1.5">Welcome back to your manufacturing dashboard.</p>
      </motion.div>

      {/* Demo credentials hint */}
      <motion.button
        type="button"
        variants={item}
        onClick={fillDemoCredentials}
        className={`mb-7 w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none active:scale-[0.98] ${
          isDemoClicked 
            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30' 
            : 'bg-blue-50 border-blue-100 hover:bg-blue-100/50 text-blue-700'
        }`}
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${isDemoClicked ? 'bg-white' : 'bg-blue-500'}`} />
        <p className={`text-sm font-medium ${isDemoClicked ? 'text-white' : 'text-blue-700'}`}>
          Click here to use <span className="font-mono font-bold">demo credentials</span>
        </p>
      </motion.button>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

        {/* Email field */}
        <motion.div variants={item} className="space-y-1.5">
          <Label htmlFor="email" className="text-sm font-semibold text-slate-700 block">
            Email address
          </Label>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Mail className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
            </span>
            <input
              id="email"
              type="email"
              placeholder="admin@erp.com"
              autoComplete="email"
              autoFocus
              className={`
                w-full pl-10 pr-4 h-12 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400
                outline-none transition-all duration-200
                focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]
                ${errors.email
                  ? 'border-red-400 ring-3 ring-red-400/15'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
              {...register('email')}
            />
          </div>
          <AnimatePresence>
            {errors.email && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-red-500 font-medium flex items-center gap-1.5 pl-0.5"
              >
                <AlertCircle className="h-3 w-3" /> {errors.email.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Password field */}
        <motion.div variants={item} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-sm font-semibold text-slate-700">
              Password
            </Label>
            <a href="#" className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors">
              Forgot password?
            </a>
          </div>
          <div className="relative group">
            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-[18px] w-[18px] text-slate-400 group-focus-within:text-blue-500 transition-colors duration-200" />
            </span>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              autoComplete="current-password"
              className={`
                w-full pl-10 pr-11 h-12 rounded-xl border bg-white text-slate-900 text-sm placeholder:text-slate-400
                outline-none transition-all duration-200
                focus:border-blue-500 focus:ring-3 focus:ring-blue-500/15 focus:shadow-[0_0_0_3px_rgba(59,130,246,0.15)]
                ${errors.password
                  ? 'border-red-400 ring-3 ring-red-400/15'
                  : 'border-slate-200 hover:border-slate-300'
                }
              `}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
            </button>
          </div>
          <AnimatePresence>
            {errors.password && (
              <motion.p
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-xs text-red-500 font-medium flex items-center gap-1.5 pl-0.5"
              >
                <AlertCircle className="h-3 w-3" /> {errors.password.message}
              </motion.p>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Remember Me */}
        <motion.div variants={item} className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="rememberMe"
            checked={rememberMe}
            onChange={(e) => setValue('rememberMe', e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 focus:ring-offset-0 accent-blue-600"
          />
          <Label htmlFor="rememberMe" className="text-sm text-slate-500 font-normal cursor-pointer select-none">
            Keep me signed in for 24 hours
          </Label>
        </motion.div>

        {/* Server Error */}
        <AnimatePresence>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
              className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600"
            >
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span className="font-medium">{serverError}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sign In Button */}
        <motion.div variants={item} className="pt-1">
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
              text-white text-sm font-bold transition-all duration-200
              shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40
              hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.99]
              disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none
              flex items-center justify-center gap-2 group"
          >
            {isSuccess ? (
              <motion.span
                initial={{ scale: 0.8 }} animate={{ scale: 1 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" /> Success — Redirecting
              </motion.span>
            ) : isSubmitting ? (
              <motion.span
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <Loader2 className="h-4 w-4 animate-spin" /> Verifying...
              </motion.span>
            ) : (
              <span className="flex items-center gap-2">
                Sign in
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </span>
            )}
          </button>
        </motion.div>
      </form>

      {/* Footer */}
      <motion.p variants={item} className="mt-7 text-center text-xs text-slate-400 leading-relaxed">
        By signing in, you agree to our{' '}
        <a href="#" className="text-blue-600 hover:underline font-medium">Terms</a>{' '}
        and{' '}
        <a href="#" className="text-blue-600 hover:underline font-medium">Privacy Policy</a>.
      </motion.p>
    </motion.div>
  );
}
