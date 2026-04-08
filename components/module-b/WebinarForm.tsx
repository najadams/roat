'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { webinarSchema, type WebinarFormData } from '@/lib/validations/webinar.schema'
import { createWebinar } from '@/actions/webinar.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export function WebinarForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WebinarFormData>({
    resolver: zodResolver(webinarSchema),
  })

  async function onSubmit(data: WebinarFormData) {
    const result = await createWebinar(data)

    if (result.error) {
      if (typeof result.error === 'string') {
        toast.error(result.error)
      } else {
        toast.error('Please check the form for errors')
      }
      return
    }

    toast.success('Webinar tracking initiated successfully')
    router.push(`/module-b/webinars/${result.id}`)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card className="border-slate-100 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 tracking-tight">
            Country Information
          </CardTitle>
          <CardDescription className="text-sm text-slate-500">
            Enter the country for which this webinar is being organised.
            A 6-step workflow will be automatically created.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="country" className="text-sm font-medium text-slate-700">
                Country Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="country"
                {...register('country')}
                placeholder="e.g. France"
                className="h-10 text-sm border-slate-200"
              />
              {errors.country && (
                <p className="text-xs text-red-500">{errors.country.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code" className="text-sm font-medium text-slate-700">
                ISO Country Code
                <span className="text-slate-400 font-normal ml-1">(2-letter, e.g. FR)</span>
              </Label>
              <Input
                id="country_code"
                {...register('country_code')}
                placeholder="FR"
                maxLength={2}
                className="h-10 text-sm border-slate-200 uppercase w-full"
              />
              {errors.country_code && (
                <p className="text-xs text-red-500">{errors.country_code.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-slate-700">
              Notes
            </Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any initial notes about this webinar..."
              rows={3}
              className="text-sm border-slate-200 resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Workflow preview */}
      <Card className="border-slate-100 shadow-sm bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-slate-700 tracking-tight">
            Workflow Preview
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            The following tasks will be created automatically in sequence.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {[
              'Notice to Ministry of Finance',
              'Contact with Mission',
              'Date Confirmation with Mission',
              'Flyer Distribution',
              'Hosting of Webinar',
              'Webinar Report & Leads Transfer',
            ].map((step, i) => (
              <li key={step} className="flex items-center gap-3 text-sm">
                <span className="h-6 w-6 rounded-full bg-slate-200 text-slate-500 text-xs font-semibold flex items-center justify-center flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-slate-600">{step}</span>
                <span className="ml-auto text-xs text-slate-400">5 working days</span>
              </li>
            ))}
          </ol>
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
          {isSubmitting ? 'Creating...' : 'Begin Tracking'}
        </Button>
      </div>
    </form>
  )
}
