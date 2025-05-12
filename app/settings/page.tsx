"use client"

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { getUserPreferences, updateUserPreferences } from '@/lib/actions'

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    openaiAccessToken: '',
    systemPrompt: ''
  })

  useEffect(() => {
    async function loadPreferences() {
      try {
        const result = await getUserPreferences()
        if (result.success && result.data) {
          setFormData({
            openaiAccessToken: result.data.openaiAccessToken || '',
            systemPrompt: result.data.systemPrompt || ''
          })
        } else {
          toast({
            title: 'Lỗi tải cài đặt',
            description: result.error || 'Không thể tải cài đặt hiện tại.',
            variant: 'destructive'
          })
        }
      } catch (error) {
        toast({
          title: 'Lỗi',
          description: 'Đã có lỗi xảy ra khi tải cài đặt.',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }
    loadPreferences()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await updateUserPreferences(formData)
      if (result.success) {
        toast({
          title: 'Đã lưu cài đặt',
          description: 'Cài đặt của bạn đã được cập nhật thành công.',
          variant: 'success'
        })
      } else {
        toast({
          title: 'Lỗi lưu cài đặt',
          description: result.error || 'Không thể lưu cài đặt.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Đã có lỗi xảy ra khi lưu cài đặt.',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="ml-2">Đang tải cài đặt...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8 border-b-4 border-black pb-4">Cài đặt</h1>
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-4">
          <label className="block">
            <span className="text-lg font-bold">OpenAI Access Token</span>
            <Input
              type="password"
              value={formData.openaiAccessToken}
              onChange={(e) => setFormData(prev => ({ ...prev, openaiAccessToken: e.target.value }))}
              placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="mt-2 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <p className="mt-2 text-sm text-gray-600">Nhập OpenAI API key của bạn. Key này sẽ được lưu trữ an toàn.</p>
          </label>

          <label className="block">
            <span className="text-lg font-bold">System Prompt Mặc định</span>
            <Textarea
              value={formData.systemPrompt}
              onChange={(e) => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              placeholder="Ví dụ: Bạn là một trợ lý AI hữu ích chuyên viết nội dung marketing..."
              className="mt-2 min-h-[150px] border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
            />
            <p className="mt-2 text-sm text-gray-600">Prompt này sẽ được sử dụng làm cơ sở cho việc tạo nội dung (nếu không có prompt cụ thể hơn).</p>
          </label>
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full sm:w-auto bg-black text-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none transition-all"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang lưu...
            </>
          ) : (
            'Lưu thay đổi'
          )}
        </Button>
      </form>
    </div>
  )
}