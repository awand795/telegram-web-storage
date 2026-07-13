import { useState } from 'react'
import { createRoute } from '@tanstack/react-router'
import { Route as rootRoute } from '@/routes/__root'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateProfile } from '@/queries'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import { User, Mail, Lock, Eye, EyeOff, Save, Shield } from 'lucide-react'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/profile',
  component: ProfilePage,
})

function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const updateProfile = useUpdateProfile()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const payload: any = {}
      if (name !== user?.name) payload.name = name
      if (email !== user?.email) payload.email = email

      if (newPassword) {
        if (newPassword !== newPasswordConfirmation) {
          toast.error('Passwords do not match')
          setSaving(false)
          return
        }
        if (!currentPassword) {
          toast.error('Current password is required to set a new password')
          setSaving(false)
          return
        }
        payload.current_password = currentPassword
        payload.password = newPassword
        payload.password_confirmation = newPasswordConfirmation
      }

      if (Object.keys(payload).length === 0) {
        toast.info('No changes to save')
        setSaving(false)
        return
      }

      const result = await updateProfile.mutateAsync(payload)
      setUser(result.user)
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirmation('')
      toast.success(result.message || 'Profile updated!')
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to update profile'
      const errors = err?.response?.data?.errors
      if (errors) {
        const firstError = Object.values(errors).flat()[0]
        toast.error(String(firstError))
      } else {
        toast.error(msg)
      }
    } finally {
      setSaving(false)
    }
  }

  const initials = user?.name?.charAt(0)?.toUpperCase() || '?'
  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '-'

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Profile Settings</h1>
        <p className="text-sm text-text-muted">Manage your account information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Avatar Card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border-default bg-surface p-6 text-center"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-secondary text-2xl font-bold text-white shadow-lg shadow-accent-primary/20">
            {initials}
          </div>
          <h2 className="mt-4 text-lg font-semibold text-text-primary">{user?.name}</h2>
          <p className="text-sm text-text-muted capitalize">{user?.role || 'user'}</p>

          <div className="mt-6 space-y-2 text-left">
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Mail className="h-3.5 w-3.5" />
              <span>{user?.email || 'No email set'}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <Shield className="h-3.5 w-3.5" />
              <span>Member since {memberSince}</span>
            </div>
            {user?.telegram_id && (
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span>Connected to Telegram</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Edit Form */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border-default bg-surface p-6 md:col-span-2"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border-default pt-5">
              <h3 className="text-sm font-medium text-text-secondary mb-4">Change Password</h3>

              {/* Current Password */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      minLength={6}
                      className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPasswordConfirmation}
                      onChange={(e) => setNewPasswordConfirmation(e.target.value)}
                      placeholder="Repeat password"
                      minLength={6}
                      className="w-full rounded-xl border border-border-default bg-canvas py-2.5 pl-10 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-accent-primary focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={saving || updateProfile.isPending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-primary px-6 text-sm font-medium text-white hover:bg-accent-primary/90 disabled:opacity-50 transition-all active:scale-[0.97]"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  )
}
