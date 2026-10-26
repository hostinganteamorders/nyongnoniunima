import { AdminLoginRequired } from '@/components/admin-login-required'
import { isAuthError } from '@/lib/admin-error'
import { getSelectionAdminData } from '@/server/actions/selection'
import { getRegistrationRules } from '@/server/actions/registration-rules'
import { SelectionClient } from './selection-client'

export default async function AdminSelectionPage() {
  try {
    const data = await getSelectionAdminData()
    const rules = await getRegistrationRules().catch(() => null)
    return <SelectionClient initialData={data} initialAuditionDate={rules?.year === data.activeYear ? rules.auditionStart : undefined} />
  } catch (error) {
    if (isAuthError(error)) return <AdminLoginRequired />
    throw error
  }
}
