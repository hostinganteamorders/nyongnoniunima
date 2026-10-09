import { getApplicants, getApplicantStats } from '@/server/actions/applicants'
import { ApplicantsClient } from './applicants-client'
import { isAuthError } from '@/lib/admin-error'
import { AdminLoginRequired } from '@/components/admin-login-required'

export default async function AdminApplicantsPage() {
  try {
    const [applicants, stats] = await Promise.all([getApplicants(), getApplicantStats()])
    return <ApplicantsClient applicants={applicants as any[]} stats={stats} />
  } catch (error) {
    if (isAuthError(error)) return <AdminLoginRequired />
    throw error
  }
}
