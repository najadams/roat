'use client'

import { useForm } from 'react-hook-form'
import { useState, useEffect, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { activitySchema, type ActivityFormData, type ActivityFormInput } from '@/lib/validations/activity.schema'
import { createActivity, updateActivity, addActivityAttachments, getActivityAttachments } from '@/actions/activity.actions'
import { createClient } from '@/lib/supabase/client'
import {
  ACCRA_STORAGE_ACTIVITY_TYPE,
  ACTIVITY_TYPE_LABELS,
  REGIONAL_ACTIVITY_TYPE_LABELS,
} from '@/types/activity.types'
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
import { ZoneSelector } from '@/components/shared/ZoneSelector'
import type { Activity } from '@/types/activity.types'
import { Check } from 'lucide-react'

interface ActivityFormProps {
  activity?: Activity
  isAdmin?: boolean
  userZone?: string | null
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

type ActivityTypeValue = ActivityFormData['activity_type']
const ACCRA_DEFAULT_COMPANY = 'Accra Operations'
const ACCRA_DEFAULT_LOCATION = 'Accra'
const todayString = () => new Date().toISOString().slice(0, 10)

export function ActivityForm({ activity, isAdmin = false, userZone = null }: ActivityFormProps) {
  const router = useRouter()
  const isEditing = !!activity
  const fieldsLocked = isEditing && !isAdmin
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<ActivityTypeValue[]>(
    activity ? [activity.activity_type as ActivityTypeValue] : []
  )

  const {
    register,
    handleSubmit,
    setValue,
    getValues,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormInput, unknown, ActivityFormData>({
    resolver: zodResolver(activitySchema),
    defaultValues: activity
      ? {
          activity_type: activity.activity_type as ActivityFormData['activity_type'],
          zonal_office: activity.zonal_office as ActivityFormData['zonal_office'],
          date: activity.date,
          company_name: activity.company_name,
          location: activity.location,
          telephone: activity.telephone ?? '',
          email: activity.email ?? '',
          sector: activity.sector ?? '',
          detail: activity.detail ?? '',
          action_required: activity.action_required ?? '',
          custom_activity_description: activity.detail ?? '',
          outcome: activity.outcome ?? '',
          investment_amount: activity.investment_amount ?? '',
          investment_currency: activity.investment_currency ?? 'USD',
          jobs_created: activity.jobs_created ?? '',
          status: activity.status as ActivityFormData['status'],
        }
      : {
          status: 'pending',
          investment_currency: 'USD',
          // Head office (admins) defaults to the Accra region
          ...(isAdmin ? { zonal_office: 'accra' as ActivityFormData['zonal_office'] } : {}),
        },
  })

  const selectedType = watch('activity_type')
  const selectedStatus = watch('status')
  const selectedZone = watch('zonal_office')
  const wasAccraMode = useRef(false)
  const effectiveZone = isEditing
    ? activity.zonal_office
    : isAdmin
      ? selectedZone
      : userZone
  const isAccraMode = effectiveZone === 'accra'

  // Evidence files
  const [files, setFiles] = useState<File[]>([])
  const [existing, setExisting] = useState<{ id: string; name: string; url: string | null }[]>([])

  useEffect(() => {
    if (activity?.id) getActivityAttachments(activity.id).then(setExisting)
  }, [activity?.id])

  useEffect(() => {
    if (isAccraMode) {
      const accraType = ACCRA_STORAGE_ACTIVITY_TYPE as ActivityTypeValue
      if (selectedActivityTypes.length !== 1 || selectedActivityTypes[0] !== accraType) {
        setSelectedActivityTypes([accraType])
      }
      setValue('activity_type', ACCRA_STORAGE_ACTIVITY_TYPE as ActivityTypeValue, { shouldValidate: true })
      setValue('investment_amount', undefined, { shouldValidate: true })
      setValue('investment_currency', '', { shouldValidate: true })
      setValue('jobs_created', undefined, { shouldValidate: true })
      setValue('date', activity?.date ?? todayString(), { shouldValidate: true })
      setValue('company_name', activity?.company_name ?? ACCRA_DEFAULT_COMPANY, { shouldValidate: true })
      setValue('location', activity?.location ?? ACCRA_DEFAULT_LOCATION, { shouldValidate: true })
      setValue('telephone', activity?.telephone ?? '', { shouldValidate: true })
      setValue('email', activity?.email ?? '', { shouldValidate: true })
      setValue('sector', activity?.sector ?? '', { shouldValidate: true })
      setValue('detail', activity?.detail ?? '', { shouldValidate: true })
      setValue('action_required', activity?.action_required ?? '', { shouldValidate: true })
      setValue('outcome', activity?.outcome ?? '', { shouldValidate: true })
      wasAccraMode.current = true
      return
    }

    if (wasAccraMode.current) {
      setSelectedActivityTypes([])
      setValue('activity_type', undefined as unknown as ActivityTypeValue, { shouldValidate: true })
      wasAccraMode.current = false
    }
    if (!isEditing) {
      if (getValues('company_name') === ACCRA_DEFAULT_COMPANY) setValue('company_name', '', { shouldValidate: true })
      if (getValues('location') === ACCRA_DEFAULT_LOCATION) setValue('location', '', { shouldValidate: true })
    }
  }, [activity, getValues, isAccraMode, isEditing, selectedActivityTypes, setValue])

  function toggleActivityType(value: ActivityTypeValue) {
    const next = selectedActivityTypes.includes(value)
      ? selectedActivityTypes.filter(type => type !== value)
      : [...selectedActivityTypes, value]

    setSelectedActivityTypes(next)
    setValue('activity_type', next[0] as ActivityTypeValue, { shouldValidate: true })
  }

  async function uploadEvidence(activityIds: string[]) {
    if (files.length === 0) return true
    const supabase = createClient()
    let completed = true

    for (const activityId of activityIds) {
      const uploaded: { path: string; name: string; mime: string }[] = []
      for (const file of files) {
        const path = `${activityId}/${Date.now()}-${file.name}`
        const { error } = await supabase.storage.from('evidence').upload(path, file)
        if (error) {
          completed = false
          continue
        }
        uploaded.push({ path, name: file.name, mime: file.type })
      }

      if (uploaded.length > 0) {
        const result = await addActivityAttachments(activityId, uploaded)
        if (result?.error) completed = false
      }
    }

    return completed
  }

  async function onSubmit(data: ActivityFormData) {
    const payload = isAccraMode
      ? {
          ...data,
          activity_type: ACCRA_STORAGE_ACTIVITY_TYPE as ActivityFormData['activity_type'],
          activity_types: [ACCRA_STORAGE_ACTIVITY_TYPE],
          date: data.date || todayString(),
          company_name: data.company_name || ACCRA_DEFAULT_COMPANY,
          location: data.location || ACCRA_DEFAULT_LOCATION,
        }
      : { ...data, activity_types: selectedActivityTypes }

    const result = isEditing
      ? await updateActivity(activity.id, payload)
      : await createActivity(payload)

    if (result.error) {
      if (typeof result.error === 'string') {
        toast.error(result.error)
      } else {
        toast.error('Please check the form for errors')
      }
      return
    }

    const activityIds = isEditing
      ? [activity.id]
      : (result as { ids?: string[]; id?: string }).ids ?? []
    const uploadCompleted = await uploadEvidence(activityIds)

    if (!uploadCompleted) {
      toast.warning('Activities saved, but some evidence files could not be uploaded')
    } else {
      toast.success(
        isEditing
          ? 'Activity updated successfully'
          : activityIds.length > 1
            ? `${activityIds.length} activities logged successfully`
            : 'Activity logged successfully'
      )
    }
    router.push('/module-a/activities')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Activity Type / Accra Description */}
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
            {isAccraMode ? 'Activity Description' : 'Activity Type'}
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            {isAccraMode
              ? 'Describe the Accra activity in clear operational terms.'
              : isEditing
                ? 'Select the category that best describes this activity.'
                : 'Select every activity completed for this company.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAccraMode ? (
            fieldsLocked ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-sm leading-6 text-slate-700">
                  {activity!.detail}
                </p>
                <p className="mt-2 text-xs text-slate-400">(locked)</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  id="custom_activity_description"
                  rows={5}
                  placeholder="Describe the activity, engagement, issue handled, or support provided by the Accra team."
                  {...register('custom_activity_description')}
                  className="text-sm border-slate-200 leading-6"
                />
                {errors.custom_activity_description && (
                  <p className="text-xs text-red-500">{errors.custom_activity_description.message}</p>
                )}
              </div>
            )
          ) : fieldsLocked ? (
            <div className="flex items-center gap-2 px-3.5 py-3 rounded-lg border border-slate-200 bg-slate-50 w-fit">
              <span className="text-sm font-medium text-slate-800">
                {ACTIVITY_TYPE_LABELS[activity!.activity_type]}
              </span>
              <span className="text-xs text-slate-400">(locked)</span>
            </div>
          ) : isEditing ? (
            <>
              <RadioGroup
                value={selectedType}
                onValueChange={val => setValue('activity_type', val as ActivityFormData['activity_type'])}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
              >
                {Object.entries(REGIONAL_ACTIVITY_TYPE_LABELS).map(([value, label]) => (
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
          ) : (
            <>
              <div className="mb-4 inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {selectedActivityTypes.length === 1
                  ? '1 selected'
                  : `${selectedActivityTypes.length} selected`}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {Object.entries(REGIONAL_ACTIVITY_TYPE_LABELS).map(([value, label]) => {
                  const typedValue = value as ActivityTypeValue
                  const selected = selectedActivityTypes.includes(typedValue)

                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleActivityType(typedValue)}
                      className={`group flex min-h-20 items-center gap-4 rounded-lg border p-4 text-left transition-colors ${
                        selected
                          ? 'border-slate-950 bg-slate-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                      }`}
                    >
                      <span
                        className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border transition-colors ${
                          selected
                            ? 'border-slate-950 bg-slate-950 text-white'
                            : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                        }`}
                      >
                        <Check className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm font-semibold leading-5 tracking-tight text-slate-800">
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
              {errors.activity_type && (
                <p className="mt-2 text-xs text-red-500">{errors.activity_type.message}</p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Zonal Office — admins only (officers inherit their own zone) */}
      {isAdmin && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
              Zonal Office
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Select the zone this activity belongs to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <ZoneSelector
                value={selectedZone ?? ''}
                onChange={val =>
                  setValue('zonal_office', val as ActivityFormData['zonal_office'])
                }
              />
            </div>
            {errors.zonal_office && (
              <p className="mt-2 text-xs text-red-500">{errors.zonal_office.message}</p>
            )}
          </CardContent>
        </Card>
      )}

      {!isAccraMode && (
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
                {errors.telephone && (
                  <p className="text-xs text-red-500">{errors.telephone.message}</p>
                )}
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
      )}

      {!isAccraMode && (
        <Card className="border-slate-100 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
              Investment Outcome
            </CardTitle>
            <CardDescription className="text-sm text-slate-500">
              Optional — record the investment value and jobs linked to this activity.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-2">
                <Label htmlFor="investment_amount" className="text-sm font-medium text-slate-700">
                  Investment Value
                </Label>
                <Input
                  id="investment_amount"
                  type="number"
                  min="0"
                  step="any"
                  {...register('investment_amount')}
                  placeholder="0.00"
                  className="h-10 text-sm border-slate-200"
                />
                {errors.investment_amount && (
                  <p className="text-xs text-red-500">{errors.investment_amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="investment_currency" className="text-sm font-medium text-slate-700">
                  Currency
                </Label>
                <Select
                  value={watch('investment_currency')}
                  onValueChange={val => setValue('investment_currency', val)}
                >
                  <SelectTrigger className="h-10 text-sm border-slate-200">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {['USD', 'GHS', 'EUR', 'GBP'].map(c => (
                      <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="jobs_created" className="text-sm font-medium text-slate-700">
                  Jobs Created
                </Label>
                <Input
                  id="jobs_created"
                  type="number"
                  min="0"
                  step="1"
                  {...register('jobs_created')}
                  placeholder="0"
                  className="h-10 text-sm border-slate-200"
                />
                {errors.jobs_created && (
                  <p className="text-xs text-red-500">{errors.jobs_created.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!isAccraMode && (
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
            <div className="space-y-2">
              <Label htmlFor="outcome" className="text-sm font-medium text-slate-700">
                Outcome
              </Label>
              <Textarea
                id="outcome"
                {...register('outcome')}
                placeholder="Result / outcome of this activity (for the weekly report)..."
                rows={3}
                className="text-sm border-slate-200 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="evidence" className="text-sm font-medium text-slate-700">
                Evidence (Photos / Documents) <span className="font-normal text-slate-400">— optional</span>
              </Label>
              {existing.length > 0 && (
                <ul className="space-y-1">
                  {existing.map(a => (
                    <li key={a.id} className="text-sm">
                      {a.url ? (
                        <a href={a.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {a.name}
                        </a>
                      ) : (
                        <span className="text-slate-600">{a.name}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <Input
                id="evidence"
                type="file"
                multiple
                accept="image/*,application/pdf"
                onChange={e => setFiles(Array.from(e.target.files ?? []))}
                className="h-auto py-2 text-sm border-slate-200"
              />
              {files.length > 0 && (
                <p className="text-xs text-slate-500">{files.length} file(s) ready to upload on save</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
            : selectedActivityTypes.length > 1
              ? 'Log Activities'
              : 'Log Activity'}
        </Button>
      </div>
    </form>
  )
}
