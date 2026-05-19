import { useRef, useState } from 'react'

interface Props {
  onSend: (text: string) => void
  onPhoto: (file: File) => void
  onLibraryOpen: () => void
  disabled?: boolean
}

export default function ChatInput({ onSend, onPhoto, onLibraryOpen, disabled }: Props) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function submit() {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setValue('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${e.target.scrollHeight}px`
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      onPhoto(file)
      // reset so the same file can be re-selected
      e.target.value = ''
    }
  }

  return (
    <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-end gap-2">
      {/* hidden camera / file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        rows={1}
        placeholder="What did you eat?"
        className="flex-1 resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 max-h-36 overflow-y-auto"
      />

      {/* Library button */}
      <button
        type="button"
        onClick={onLibraryOpen}
        disabled={disabled}
        aria-label="Search library"
        className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-40 shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
      </button>

      {/* Camera button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled}
        aria-label="Attach nutrition label photo"
        className="text-gray-400 hover:text-blue-500 disabled:opacity-40 transition-colors p-1 shrink-0"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
          <path d="M12 9a3.75 3.75 0 1 0 0 7.5A3.75 3.75 0 0 0 12 9Z" />
          <path
            fillRule="evenodd"
            d="M9.344 3.071a49.52 49.52 0 0 1 5.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 0 1-3 3h-15a3 3 0 0 1-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 0 0 1.11-.71l.822-1.315c.502-.806 1.364-1.34 2.332-1.392Zm.663 9.679a3 3 0 1 1 3.986 0l.036.037a3 3 0 0 1-4.058 0l-.036-.037-.02-.02Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <button
        onClick={submit}
        disabled={disabled || !value.trim()}
        className="bg-blue-500 hover:bg-blue-600 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors shrink-0"
      >
        Send
      </button>
    </div>
  )
}
