'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { activitySchema, type ActivityFormData, type ActivityFormInput } from '@/lib/validations/activity.schema'
import { createActivity, updateActivity } from '@/actions/activity.actions'
import { ACTIVITY_TYPE_LABELS } from '@/types/activity.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import type { Activity } from '@/types/activity.types'

interface ActivityFormProps {
  activity?: Activity
  isAdmin?: boolean
}

const ACTIVITY_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

const SECTORS = [
  'Agriculture', 'Mining', 'Manufacturing', 'Technology',
  'Finance', 'Fintech', 'Healthcare', 'Education', 'Energy', 'Tourism',
  'Construction', 'Retail - Trading', 'Real Estate', 'Other',
]

export function ActivityForm({ activity, isAdmin = true }: ActivityFormProps) {
  const router = useRouter()
  const isEditing = !!activity
  const fieldsLocked = isEditing && !isAdmin

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormInput, unknown, ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: activity
      ? {
          activity_type: activity.activity_type as ActivityFormData['activity_type'],
          date: activity.date,
          company_name: activity.company_name,
          location: activity.location,
          telephone: activity.telephone ?? '',
          email: activity.email ?? '',
          sector: activity.sector ?? '',
          detail: activity.detail ?? '',
          action_required: activity.action_required ?? '',
          status: activity.status as ActivityFormData['status'],
        }
      : { status: 'pending' },
  })

  const selectedType = watch('activity_type')
  const selectedStatus = watch('status')

  async function onSubmit(data: ActivityFormData) {
    const result = isEditing
      ? await updateActivity(activity.id, data)
      : await createActivity(data)

    if (result.error) {
      if (typeof result.error === 'string') {
        toast.error(result.error)
      } else {
        toast.error('Please check the form for errors')
      }
      return
    }

    toast.success(isEditing ? 'Activity updated successfully' : 'Activity logged successfully')
    router.push('/module-a/activities')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Activity Type */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
            Activity Type
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Select the category that best describes this activity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fieldsLocked ? (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-lg border border-slate-200 bg-slate-50 w-fit">
              <span className="text-sm font-medium text-slate-800">
                {ACTIVITY_TYPE_LABELS[activity!.activity_type]}
              </span>
              <span className="text-xs text-slate-400">(locked)</span>
            </div>
          ) : (
            <>
              <RadioGroup
                value={selectedType}
                onValueChange={val => setValue('activity_type', val as ActivityFormData['activity_type'])}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {Object.entries(ACTIVITY_TYPE_LABELS).map(([value, label]) => (
                  <label
                    key={value}
                    className={`flex items-center gap-3 p-3.5 rounded-lg border cursor-pointer transition-colors ${
                      selectedType === value
                        ? 'border-slate-900 bg-slate-50'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <RadioGroupItem value={value} id={value} className="flex-shrink-0" />
                    <span className="text-sm font-medium text-slate-700">{label}</span>
                  </label>
                ))}
              </RadioGroup>
              {errors.activity_type && (
                <p className="mt-2 text-xs text-red-500">{errors.activity_type.message}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Core Details */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
            Core Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm font-medium text-slate-700">
                Date <span className="text-red-500">*</span>
              </Label>
              {fieldsLocked ? (
                <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-slate-200 bg-slate-50">
                  <span className="text-sm text-slate-700">{activity!.date}</span>
                  <span className="text-xs text-slate-400">(locked)</span>
                </div>
              ) : (
                <>
                  <Input
                    id="date"
                    type="date"
                    {...register('date')}
                    className="h-10 text-sm border-slate-200"
                  />
                  {errors.date && (
                    <p className="text-xs text-red-500">{errors.date.message}</p>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sector" className="text-sm font-medium text-slate-700">
                Sector
              </Label>
              <Select value={watch('sector')} onValueChange={val => setValue('sector', val)}>
                <SelectTrigger className="h-10 text-sm border-slate-200">
                  <SelectValue placeholder="Select sector" />
                </SelectTrigger>
                <SelectContent>
                  {SECTORS.map(s => (
                    <SelectItem key={s} value={s} className="text-sm">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name" className="text-sm font-medium text-slate-700">
              Company / Organisation Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="company_name"
              {...register('company_name')}
              placeholder="Enter company or organisation name"
              className="h-10 text-sm border-slate-200"
            />
            {errors.company_name && (
              <p className="text-xs text-red-500">{errors.company_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-slate-700">
              Location <span className="text-red-500">*</span>
            </Label>
            <Input
              id="location"
              {...register('location')}
              placeholder="City or address"
              className="h-10 text-sm border-slate-200"
            />
            {errors.location && (
              <p className="text-xs text-red-500">{errors.location.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="telephone" className="text-sm font-medium text-slate-700">
                Telephone
              </Label>
              <Input
                id="telephone"
                type="tel"
                {...register('telephone')}
                placeholder="+233 xx xxx xxxx"
                className="h-10 text-sm border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...register('email')}
                placeholder="contact@company.com"
                className="h-10 text-sm border-slate-200"
              />
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes & Actions */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
            Notes & Follow-up
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="detail" className="text-sm font-medium text-slate-700">
              Detail / Summary
            </Label>
            <Textarea
              id="detail"
              {...register('detail')}
              placeholder="Describe the activity in detail..."
              rows={4}
              className="text-sm border-slate-200 resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="action_required" className="text-sm font-medium text-slate-700">
              Action Required
            </Label>
            <Textarea
              id="action_required"
              {...register('action_required')}
              placeholder="Any follow-up actions needed..."
              rows={3}
              className="text-sm border-slate-200 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
            Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={selectedStatus}
            onValueChange={val => setValue('status', val as ActivityFormData['status'])}
            className="flex flex-wrap gap-3"
          >
            {ACTIVITY_STATUSES.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  selectedStatus === value
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <RadioGroupItem value={value} id={`status-${value}`} className="flex-shrink-0" />
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-slate-900 hover:bg-slate-800 text-white px-8 text-sm font-medium tracking-wide"
        >
          {isSubmitting
            ? 'Saving...'
            : isEditing
            ? 'Update Activity'
            : 'Log Activity'}
        </Button>
      </div>
    </form>
  )
}
