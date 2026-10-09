import { getApplicants } from '@/server/actions/applicants'
import { FinalistsClient } from './finalists-client'
import { isAuthError } from '@/lib/admin-error'
import { AdminLoginRequired } from '@/components/admin-login-required'

export default async function AdminFinalistsPage() {
  try {
    const applicants = await getApplicants()
    return <FinalistsClient applicants={applicants as any[]} />
  } catch (error) {
    if (isAuthError(error)) return <AdminLoginRequired />
    throw error
  }
}
