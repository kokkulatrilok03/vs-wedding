import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion'
import Confetti from 'react-confetti'
import {
  FaBars,
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaHeart,
  FaMapMarkerAlt,
  FaTimes,
} from 'react-icons/fa'

const weddingDate = new Date('2026-04-29T11:45:00+05:30')

/** Primary luxury nav (desktop center + mobile drawer) */
const primaryNav = [
  { id: 'hero', label: 'Home' },
  { id: 'details', label: 'Details' },
  { id: 'countdown', label: 'Countdown' },
  { id: 'story', label: 'Story' },
  { id: 'family', label: 'Family' },
  { id: 'gallery', label: 'Gallery' },
  { id: 'location', label: 'Venue' },
]

const extraNav = [
  { id: 'blessings', label: 'Blessings' },
]

const CLOUDINARY_BASE = 'https://res.cloudinary.com/dzdcwy4m5/image/upload'

const couplePhotos = {
  hero: `${CLOUDINARY_BASE}/c_fill,q_auto,f_auto,w_2000/v1776106508/WhatsApp_Image_2026-04-14_at_12.12.02_AM_xjofxd.jpg`,
  gallery: [
    {
      src: `${CLOUDINARY_BASE}/c_fill,q_auto,f_auto,w_900/v1776106508/WhatsApp_Image_2026-04-14_at_12.12.02_AM_xjofxd.jpg`,
      alt: 'Varsha and Sai Kumar — traditional',
    },
    {
      src: `${CLOUDINARY_BASE}/c_fill,q_auto,f_auto,w_900/v1776106507/WhatsApp_Image_2026-04-14_at_12.12.01_AM_nzqh95.jpg`,
      alt: 'Varsha and Sai Kumar — blessings',
    },
    {
      src: `${CLOUDINARY_BASE}/c_fill,q_auto,f_auto,w_900/v1776106507/WhatsApp_Image_2026-04-14_at_12.11.58_AM_lxq1s3.jpg`,
      alt: 'Varsha and Sai Kumar — by the water',
    },
    {
      src: `${CLOUDINARY_BASE}/c_fill,q_auto,f_auto,w_900/v1776106507/WhatsApp_Image_2026-04-14_at_12.11.55_AM_ytkaib.jpg`,
      alt: 'Varsha and Sai Kumar — together',
      caption: 'Every frame whispers forever',
    },
  ],
}
couplePhotos.gallery[0].caption = 'A royal beginning'
couplePhotos.gallery[1].caption = 'Blessings and grace'
couplePhotos.gallery[2].caption = 'Love by the water'

const storyTimeline = [
  { title: 'First Glance', text: 'A serendipitous meeting that felt like destiny unfolding.' },
  { title: 'Growing Bond', text: 'Conversations turned into laughter, and laughter into forever promises.' },
  { title: 'Families Unite', text: 'Two families came together with blessings, joy, and graceful traditions.' },
  { title: 'The Big Day', text: 'Now we step into forever, hand in hand, heart to heart.' },
]

const floatingHearts = [
  { left: '6%', size: '18px', duration: '23s', delay: '0s' },
  { left: '16%', size: '22px', duration: '28s', delay: '2.2s' },
  { left: '24%', size: '26px', duration: '24s', delay: '1s' },
  { left: '36%', size: '20px', duration: '30s', delay: '3.8s' },
  { left: '46%', size: '24px', duration: '26s', delay: '1.4s' },
  { left: '57%', size: '19px', duration: '34s', delay: '2.7s' },
  { left: '68%', size: '23px', duration: '29s', delay: '0.8s' },
  { left: '77%', size: '20px', duration: '32s', delay: '4.1s' },
  { left: '86%', size: '25px', duration: '27s', delay: '1.9s' },
  { left: '94%', size: '18px', duration: '35s', delay: '3.2s' },
]

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')
const CLIENT_ID_STORAGE_KEY = 'wedding_client_id'
const OWNED_BLESSINGS_STORAGE_KEY = 'wedding_owned_blessing_ids'
const BLESSINGS_CACHE_STORAGE_KEY = 'wedding_blessings_cache_v1'
const MUSIC_PREF_KEY = 'wedding_music_pref'
const MUSIC_VOLUME_KEY = 'wedding_music_volume'
const DEFAULT_MUSIC_VOLUME = 1
const BLESSINGS_PAGE_SIZE = 20
const BLESSINGS_REQUEST_TIMEOUT_MS = 7000
const MUSIC_SOURCES = [
  '/music/atlasaudio-piano-romantic-510293.mp3',
]
function getClientId() {
  if (typeof window === 'undefined') return ''
  const existing = localStorage.getItem(CLIENT_ID_STORAGE_KEY)
  if (existing) return existing
  const nextId = globalThis.crypto?.randomUUID?.() ?? `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  localStorage.setItem(CLIENT_ID_STORAGE_KEY, nextId)
  return nextId
}

function getOwnedBlessingIds() {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OWNED_BLESSINGS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(id)) : []
  } catch {
    return []
  }
}

function getCachedBlessings() {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(BLESSINGS_CACHE_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed?.items) || !Number.isFinite(parsed?.page)) return null
    return {
      items: parsed.items,
      page: parsed.page,
      hasMore: Boolean(parsed.hasMore),
    }
  } catch {
    return null
  }
}

function setCachedBlessings(items, page, hasMore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      BLESSINGS_CACHE_STORAGE_KEY,
      JSON.stringify({
        items,
        page,
        hasMore,
      }),
    )
  } catch {
    // no-op
  }
}

function getTimeLeft() {
  const now = new Date()
  const diff = weddingDate - now
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 }
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function App() {
  const prefersReducedMotion = useReducedMotion()
  const { scrollY, scrollYProgress } = useScroll()
  const heroY = useTransform(scrollY, [0, 600], [0, -110])
  const heroScale = useTransform(scrollY, [0, 500], [1.05, 1.15])
  const progressScaleX = useSpring(scrollYProgress, { stiffness: 90, damping: 28, mass: 0.3 })

  const [timeLeft, setTimeLeft] = useState(getTimeLeft())
  const [isIntroOpen, setIsIntroOpen] = useState(true)
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [guestName] = useState(() => {
    if (typeof window === 'undefined') return ''
    const incoming = new URLSearchParams(window.location.search).get('name')
    return incoming ? incoming.trim() : ''
  })
  const [blessingName, setBlessingName] = useState('')
  const [blessingMessage, setBlessingMessage] = useState('')
  const [blessings, setBlessings] = useState([])
  const [clientId] = useState(() => getClientId())
  const [ownedBlessingIds, setOwnedBlessingIds] = useState(() => getOwnedBlessingIds())
  const [isBlessingsLoading, setIsBlessingsLoading] = useState(true)
  const [isLoadingMoreBlessings, setIsLoadingMoreBlessings] = useState(false)
  const [hasMoreBlessings, setHasMoreBlessings] = useState(false)
  const [blessingsPage, setBlessingsPage] = useState(1)
  const [blessingsError, setBlessingsError] = useState('')
  const [isSubmittingBlessing, setIsSubmittingBlessing] = useState(false)
  const [editingBlessingId, setEditingBlessingId] = useState(null)
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800,
  })
  const [activeNavId, setActiveNavId] = useState('hero')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isNavElevated, setIsNavElevated] = useState(false)
  const [pulsedNavId, setPulsedNavId] = useState(null)
  const [musicVolume] = useState(DEFAULT_MUSIC_VOLUME)
  const [isMuted] = useState(false)
  const [musicSourceIndex, setMusicSourceIndex] = useState(0)
  const isSmallScreen = screenSize.width < 768
  const useLiteMotion = prefersReducedMotion || isSmallScreen

  const audioRef = useRef(null)
  const hasTriggeredArrivalRef = useRef(false)
  const resumeMusicRequestedRef = useRef(false)
  const fadeTimerRef = useRef(null)
  const confettiHideTimerRef = useRef(null)
  const hasHydratedBlessingsCacheRef = useRef(false)

  const triggerConfettiBurst = useCallback((durationMs = 6000, force = false) => {
    if (useLiteMotion && !force) return
    if (confettiHideTimerRef.current) {
      clearTimeout(confettiHideTimerRef.current)
      confettiHideTimerRef.current = null
    }
    setShowConfetti(true)
    confettiHideTimerRef.current = setTimeout(() => {
      setShowConfetti(false)
      confettiHideTimerRef.current = null
    }, durationMs)
  }, [useLiteMotion])

  useEffect(() => {
    const timer = setInterval(() => {
      const next = getTimeLeft()
      setTimeLeft(next)
      const arrived = Object.values(next).every((value) => value === 0)
      if (arrived && !hasTriggeredArrivalRef.current) {
        hasTriggeredArrivalRef.current = true
        triggerConfettiBurst()
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [triggerConfettiBurst])

  useEffect(() => () => {
    if (confettiHideTimerRef.current) clearTimeout(confettiHideTimerRef.current)
  }, [])

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem(MUSIC_PREF_KEY) : null
    if (saved === 'playing') {
      resumeMusicRequestedRef.current = true
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(MUSIC_VOLUME_KEY, String(DEFAULT_MUSIC_VOLUME))
  }, [])

  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.muted = isMuted
    if (!isMuted) {
      audioRef.current.volume = musicVolume
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(MUSIC_VOLUME_KEY, String(musicVolume))
    }
  }, [musicVolume, isMuted])

  useEffect(() => () => {
    if (fadeTimerRef.current) {
      clearInterval(fadeTimerRef.current)
    }
  }, [])

  useEffect(() => {
    const onResize = () => {
      setScreenSize({ width: window.innerWidth, height: window.innerHeight })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const allSections = [...primaryNav, ...extraNav]
    let rafId = 0
    let ticking = false

    const updateActive = () => {
      const viewportCenter = window.scrollY + window.innerHeight * 0.35
      let bestId = 'hero'
      let bestDist = Number.POSITIVE_INFINITY
      for (const { id } of allSections) {
        const el = document.getElementById(id)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        const elCenter = window.scrollY + rect.top + rect.height / 2
        const d = Math.abs(elCenter - viewportCenter)
        if (d < bestDist) {
          bestDist = d
          bestId = id
        }
      }
      setActiveNavId((prev) => (prev === bestId ? prev : bestId))
      setIsNavElevated((prev) => {
        const next = window.scrollY > 20
        return prev === next ? prev : next
      })
      ticking = false
    }

    const onScroll = () => {
      if (ticking) return
      ticking = true
      rafId = window.requestAnimationFrame(updateActive)
    }

    updateActive()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      window.cancelAnimationFrame(rafId)
    }
  }, [])

  const fetchBlessings = useCallback(async (page = 1, append = false) => {
    const cached = !append ? getCachedBlessings() : null
    if (!append && !hasHydratedBlessingsCacheRef.current) {
      if (cached?.items?.length) {
        setBlessings(cached.items)
        setBlessingsPage(cached.page)
        setHasMoreBlessings(cached.hasMore)
        setIsBlessingsLoading(false)
      }
      hasHydratedBlessingsCacheRef.current = true
    }

    if (append) {
      setIsLoadingMoreBlessings(true)
    } else if (!cached?.items?.length) {
      setIsBlessingsLoading(true)
    }
    let timeout
    try {
      const controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), BLESSINGS_REQUEST_TIMEOUT_MS)
      const fetchBlessingsPage = async () => fetch(`${API_BASE}/blessings?page=${page}&limit=${BLESSINGS_PAGE_SIZE}`, {
        headers: { 'X-Client-Id': clientId },
        signal: controller.signal,
      })
      let response = await fetchBlessingsPage()
      if (!response.ok && !append && page === 1) {
        response = await fetchBlessingsPage()
      }
      if (!response.ok) throw new Error('Failed to fetch blessings')
      const payload = await response.json()
      const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.items)
          ? payload.items
          : []
      const previousItems = getCachedBlessings()?.items ?? []
      const previousIds = new Set(previousItems.map((item) => item.id))
      const mergedItems = append ? [...previousItems, ...rows.filter((item) => !previousIds.has(item.id))] : rows
      const nextHasMore = Array.isArray(payload?.items) ? Boolean(payload.hasMore) : rows.length === BLESSINGS_PAGE_SIZE
      setBlessings((prev) => {
        if (!append) return rows
        const existingIds = new Set(prev.map((item) => item.id))
        const nextRows = rows.filter((item) => !existingIds.has(item.id))
        return [...prev, ...nextRows]
      })
      setBlessingsPage(page)
      setHasMoreBlessings(nextHasMore)
      setCachedBlessings(mergedItems, page, nextHasMore)
      setBlessingsError('')
    } catch {
      if (!append) {
        setBlessings([])
        setHasMoreBlessings(false)
        setBlessingsError('')
      } else {
        setBlessingsError('Unable to load more blessings right now. Please try again.')
      }
    } finally {
      if (timeout) clearTimeout(timeout)
      if (append) {
        setIsLoadingMoreBlessings(false)
      } else {
        setIsBlessingsLoading(false)
      }
    }
  }, [clientId])

  useEffect(() => {
    fetchBlessings(1, false)
  }, [fetchBlessings])

  useEffect(() => {
    if (typeof window === 'undefined') return
    localStorage.setItem(OWNED_BLESSINGS_STORAGE_KEY, JSON.stringify(ownedBlessingIds))
  }, [ownedBlessingIds])

  const timeItems = useMemo(
    () => [
      {
        label: 'Days',
        value: timeLeft.days,
        icon: <FaCalendarAlt className="inline h-3 w-3 shrink-0 text-[#8a3a62]" aria-hidden />,
      },
      { label: 'Hours', value: timeLeft.hours, icon: '⏳' },
      { label: 'Minutes', value: timeLeft.minutes, icon: '⏱️' },
      { label: 'Seconds', value: timeLeft.seconds, icon: '⌛' },
    ],
    [timeLeft],
  )

  const startMusicWithFade = useCallback(async () => {
    if (!audioRef.current) return
    if (fadeTimerRef.current) clearInterval(fadeTimerRef.current)
    for (let attempt = 0; attempt < MUSIC_SOURCES.length; attempt += 1) {
      const sourceIndex = (musicSourceIndex + attempt) % MUSIC_SOURCES.length
      audioRef.current.src = MUSIC_SOURCES[sourceIndex]
      audioRef.current.load()
      try {
        audioRef.current.volume = 0
        audioRef.current.muted = false
        await audioRef.current.play()
        setMusicSourceIndex(sourceIndex)
        setIsMusicPlaying(true)
        const targetVolume = isMuted ? 0 : musicVolume
        let vol = 0
        fadeTimerRef.current = setInterval(() => {
          vol = Math.min(vol + 0.06, targetVolume)
          if (audioRef.current) audioRef.current.volume = vol
          if (vol >= targetVolume) {
            clearInterval(fadeTimerRef.current)
            fadeTimerRef.current = null
          }
        }, 120)
        return true
      } catch {
        // Try next source.
      }
    }
    try {
      setIsMusicPlaying(false)
      if (typeof window !== 'undefined') localStorage.setItem(MUSIC_PREF_KEY, 'paused')
    } catch {
      // no-op
    }
    return false
  }, [isMuted, musicSourceIndex, musicVolume])

  const requestMusicRetryOnGesture = useCallback(() => {
    const retry = async () => {
      const started = await startMusicWithFade()
      if (started && typeof window !== 'undefined') {
        localStorage.setItem(MUSIC_PREF_KEY, 'playing')
      }
      window.removeEventListener('click', retry)
      window.removeEventListener('touchstart', retry)
      window.removeEventListener('keydown', retry)
    }
    window.addEventListener('click', retry, { once: true })
    window.addEventListener('touchstart', retry, { once: true })
    window.addEventListener('keydown', retry, { once: true })
  }, [startMusicWithFade])

  const openInvitation = async () => {
    setIsIntroOpen(false)
    triggerConfettiBurst(6000, true)
    const started = await startMusicWithFade()
    if (started) {
      if (typeof window !== 'undefined') localStorage.setItem(MUSIC_PREF_KEY, 'playing')
    } else {
      requestMusicRetryOnGesture()
    }
  }

  useEffect(() => {
    if (!resumeMusicRequestedRef.current) return
    const kickstart = async () => {
      if (!isMusicPlaying) {
        const started = await startMusicWithFade()
        if (!started) return
      }
      resumeMusicRequestedRef.current = false
      window.removeEventListener('click', kickstart)
      window.removeEventListener('touchstart', kickstart)
      window.removeEventListener('keydown', kickstart)
    }
    window.addEventListener('click', kickstart, { once: true })
    window.addEventListener('touchstart', kickstart, { once: true })
    window.addEventListener('keydown', kickstart, { once: true })
    return () => {
      window.removeEventListener('click', kickstart)
      window.removeEventListener('touchstart', kickstart)
      window.removeEventListener('keydown', kickstart)
    }
  }, [isMusicPlaying, startMusicWithFade])

  const sectionFade = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  }
  const sectionTransition = { duration: 0.5, ease: 'easeOut' }
  const sectionMotionProps = {
    initial: 'hidden',
    whileInView: 'visible',
    viewport: { once: true, amount: 0.2 },
    variants: sectionFade,
    transition: sectionTransition,
  }
  void motion

  const activeImage = selectedImageIndex !== null ? couplePhotos.gallery[selectedImageIndex] : null
  const hasArrived = Object.values(timeLeft).every((value) => value === 0)
  const welcomeText = guestName ? `Welcome, ${guestName} 💖` : 'Welcome, Dear Guest 💖'
  const handleNavClick = (event, id) => {
    event.preventDefault()
    const target = document.getElementById(id)
    if (!target) return
    const navOffset = window.innerWidth >= 768 ? 120 : 96
    const top = window.scrollY + target.getBoundingClientRect().top - navOffset
    window.scrollTo({ top, behavior: 'smooth' })
    setPulsedNavId(id)
    setTimeout(() => setPulsedNavId((prev) => (prev === id ? null : prev)), 420)
    setMobileMenuOpen(false)
  }

  const handleBlessingSubmit = async (event) => {
    event.preventDefault()
    const name = blessingName.trim()
    const message = blessingMessage.trim()
    if (!name || !message) return

    setIsSubmittingBlessing(true)
    setBlessingsError('')
    try {
      const isEditing = editingBlessingId !== null
      const response = await fetch(`${API_BASE}/blessings${isEditing ? `/${editingBlessingId}` : ''}`, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientId },
        body: JSON.stringify({ name, message }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to save blessing')
      }

      const created = await response.json()
      if (created?.id && Number.isInteger(created.id)) {
        setOwnedBlessingIds((prev) => (prev.includes(created.id) ? prev : [...prev, created.id]))
      }
      setBlessings((prev) => {
        const next = isEditing
          ? prev.map((entry) => (entry.id === editingBlessingId ? { ...entry, ...created, editable: true } : entry))
          : [{ ...created, editable: true }, ...prev]
        setCachedBlessings(next, blessingsPage, hasMoreBlessings)
        return next
      })
      setBlessingName('')
      setBlessingMessage('')
      setEditingBlessingId(null)
    } catch (error) {
      setBlessingsError(error instanceof Error ? error.message : 'Failed to save blessing. Try again.')
    } finally {
      setIsSubmittingBlessing(false)
    }
  }

  const startEditingBlessing = (entry) => {
    if (!entry?.editable) return
    setEditingBlessingId(entry.id ?? null)
    setBlessingName(entry.name ?? '')
    setBlessingMessage(entry.message ?? '')
  }

  const loadMoreBlessings = async () => {
    if (isLoadingMoreBlessings || isBlessingsLoading || !hasMoreBlessings) return
    await fetchBlessings(blessingsPage + 1, true)
  }

  return (
    <div className="relative flex flex-col overflow-x-hidden bg-[#fff1f7] pb-0 font-sans text-[#7a2e57]">
      {showConfetti && <Confetti width={screenSize.width} height={screenSize.height} numberOfPieces={140} recycle={false} />}
      <audio
        ref={audioRef}
        loop
        preload="auto"
        playsInline
        src={MUSIC_SOURCES[musicSourceIndex]}
      />

      {isIntroOpen && (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="absolute inset-0 bg-cover bg-center"
            initial={{ scale: 1.08, opacity: 0.6 }}
            style={{
              backgroundImage: `linear-gradient(rgba(74, 16, 48, 0.48), rgba(74, 16, 48, 0.68)), url('${couplePhotos.hero}')`,
              filter: 'blur(4px)',
            }}
          />
          <motion.div
            animate={{ y: 0, opacity: 1 }}
            className="relative z-10 w-full max-w-xl rounded-3xl border border-[#ffd2e7] bg-white/82 px-8 py-10 text-center shadow-[0_16px_36px_rgba(74,16,48,0.2)] backdrop-blur-sm md:px-12"
            initial={{ y: 30, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <p className="text-xs font-semibold tracking-[0.32em] text-[#d63384]/90 uppercase">Wedding Invitation</p>
            <h1 className="mt-3 font-serif text-3xl font-semibold tracking-wide leading-tight text-gray-900 md:text-5xl">You are invited to celebrate love</h1>
            <div className="mx-auto mt-4 h-px w-28 bg-gradient-to-r from-transparent via-[#e56aa1] to-transparent" />
            <p className="mt-5 font-serif text-3xl font-semibold tracking-wide text-[#d63384] md:text-4xl">Varsha(Rohini) ❤️ Sai Kumar</p>
            <button
              className="mt-8 rounded-full bg-gradient-to-r from-[#ff5ea1] to-[#e34789] px-8 py-3 font-semibold text-white shadow-lg transition hover:scale-[1.02] hover:from-[#ff73ae] hover:to-[#ea5a97]"
              onClick={openInvitation}
              type="button"
            >
              Open Invitation
            </button>
          </motion.div>
        </motion.div>
      )}

      {!useLiteMotion && (
        <>
          <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-40">
            <div className="petals-layer" />
          </div>
          <div aria-hidden="true" className="hearts-float">
            {floatingHearts.map((heart, index) => (
              <span
                key={`${heart.left}-${heart.delay}-${index}`}
                style={{
                  left: heart.left,
                  fontSize: heart.size,
                  animationDuration: heart.duration,
                  animationDelay: heart.delay,
                }}
              >
                ♥
              </span>
            ))}
          </div>
        </>
      )}

      {!isIntroOpen && (
      <motion.header
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        className="pointer-events-none fixed top-4 left-1/2 z-50 w-[90%] max-w-5xl -translate-x-1/2"
        initial={{ opacity: 0, y: -14, filter: 'blur(10px)' }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        <motion.div
          className="pointer-events-none absolute top-0 left-0 h-[2px] w-full origin-left rounded-full bg-gradient-to-r from-[#ff7eb6] via-[#ff5ea1] to-[#c83f78]"
          style={{ scaleX: progressScaleX }}
        />
        <nav
          className={`pointer-events-auto flex items-center justify-between gap-3 rounded-full border px-5 py-3 transition-all duration-300 md:gap-4 md:px-6 md:py-3.5 ${
            isNavElevated
              ? 'border-white/45 bg-white/35 shadow-lg backdrop-blur-sm'
              : 'border-white/20 bg-white/15 shadow-[0_6px_14px_rgba(156,58,103,0.08)]'
          }`}
          role="navigation"
        >
          <a
            className="group flex shrink-0 items-center gap-1 font-serif text-lg font-semibold tracking-[0.18em] text-[#8b2252] transition duration-300 hover:scale-105 hover:text-[#ff5ea1]"
            href="#hero"
            onClick={(event) => handleNavClick(event, 'hero')}
          >
            V <FaHeart className="text-sm text-[#ff5ea1] transition group-hover:scale-110" aria-hidden /> S
          </a>

          <ul className="hidden flex-1 list-none items-center justify-center gap-8 lg:flex">
            {primaryNav.map((item) => {
              const active = activeNavId === item.id
              return (
                <li key={item.id}>
                  <a
                    className={`nav-pill-link group relative font-serif text-[0.95rem] font-semibold transition duration-300 hover:scale-105 hover:text-[#ff5ea1] ${
                      active ? 'is-active text-[#8b2252]' : 'text-[#c45b8a]'
                    }`}
                    href={`#${item.id}`}
                    onClick={(event) => handleNavClick(event, item.id)}
                  >
                    <span className="relative inline-block pb-1">
                      {item.label}
                      <span className="absolute -bottom-1 left-1/2 h-[2px] w-0 -translate-x-1/2 rounded-full bg-[#ff5ea1] transition-all duration-300 group-hover:w-full" />
                      {active && <motion.span className="absolute -bottom-1 left-1/2 h-[2px] w-full -translate-x-1/2 rounded-full bg-[#ff5ea1]" layoutId="active-nav-underline" />}
                      {active && (
                        <motion.span
                          animate={useLiteMotion ? { scale: 1 } : { scale: [1, 1.16, 1] }}
                          className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[10px] text-[#ff5ea1]"
                          layoutId="active-nav-heart"
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                          ♥
                        </motion.span>
                      )}
                      {pulsedNavId === item.id && (
                        <motion.span
                          animate={useLiteMotion ? { opacity: 0 } : { scale: [1, 1.45, 1], opacity: [0.9, 0.2, 0] }}
                          className="absolute -top-2 right-[-10px] text-[11px] text-[#ff5ea1]"
                          initial={{ scale: 1, opacity: 0.95 }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        >
                          ♥
                        </motion.span>
                      )}
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>

          <div className="flex shrink-0 items-center gap-2">
            <button
              aria-expanded={mobileMenuOpen}
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/40 bg-white/30 text-[#8b2252] transition hover:bg-white/50 lg:hidden"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              type="button"
            >
              <motion.span
                animate={{ rotate: mobileMenuOpen ? 180 : 0, scale: mobileMenuOpen ? 1.08 : 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                {mobileMenuOpen ? <FaTimes className="text-lg" /> : <FaBars className="text-lg" />}
              </motion.span>
            </button>
          </div>
        </nav>
      </motion.header>
      )}

      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-[60] lg:hidden"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="mobile-nav"
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <button
              aria-label="Close menu overlay"
              className="absolute inset-0 bg-black/35"
              onClick={() => setMobileMenuOpen(false)}
              type="button"
            />
            <motion.aside
              animate={{ x: 0 }}
              className="absolute top-0 right-0 flex h-full w-[min(100%,20rem)] flex-col border-l border-white/30 bg-[#fff8fc]/95 shadow-xl"
              exit={{ x: '100%' }}
              initial={{ x: '100%' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <div className="flex items-center justify-start border-b border-[#ffd6e8] px-4 py-4">
                <span className="font-serif text-lg tracking-wide text-[#8b2252]">Menu</span>
              </div>
              <motion.ul
                animate="visible"
                className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4"
                initial="hidden"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } },
                }}
              >
                {[...primaryNav, ...extraNav].map((item) => (
                  <motion.li
                    key={item.id}
                    variants={{
                      hidden: { opacity: 0, x: 16 },
                      visible: { opacity: 1, x: 0, transition: { duration: 0.24 } },
                    }}
                  >
                    <a
                      className={`block rounded-xl px-4 py-3 font-serif text-lg transition hover:bg-[#ffe8f2] ${
                        activeNavId === item.id ? 'bg-[#ffe0ef] text-[#8b2252]' : 'text-[#a04572]'
                      }`}
                      href={`#${item.id}`}
                      onClick={(event) => handleNavClick(event, item.id)}
                    >
                      {item.label}
                      {activeNavId === item.id && (
                        <FaHeart className="ml-2 inline text-xs text-[#ff5ea1]" aria-hidden />
                      )}
                    </a>
                  </motion.li>
                ))}
              </motion.ul>
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl scroll-pt-28 px-4 pb-2 pt-28 font-sans text-base text-gray-700 md:scroll-pt-32 md:px-6 md:pb-4 md:pt-32 md:text-lg">
        <motion.p
          animate={{ opacity: 1, y: 0 }}
          className="relative z-30 mx-auto mb-6 w-fit rounded-full border border-[#ffb5d3] bg-[#fff8fc] px-5 py-2 text-center font-serif text-2xl font-semibold tracking-wide text-gray-900 shadow-md md:mb-8 md:px-6"
          initial={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        >
          {welcomeText}
        </motion.p>

        <section
          className="relative mt-2 flex min-h-[82vh] flex-col items-center justify-center rounded-[3rem] px-4 py-4 text-center md:min-h-[90vh] md:px-6 md:py-6"
          id="hero"
        >
          <motion.div
            className="absolute inset-2 rounded-[2.4rem] bg-cover bg-center md:inset-3"
            style={{
              y: heroY,
              scale: heroScale,
              backgroundImage: `linear-gradient(rgba(67,18,43,0.35), rgba(67,18,43,0.58)), url('${couplePhotos.hero}')`,
            }}
          />
          <div className="pointer-events-none absolute inset-2 rounded-[2.4rem] border border-[#ffd7e9] shadow-[0_14px_28px_rgba(145,41,93,0.16)] md:inset-3" />
          <div className="relative z-10 rounded-2xl bg-black/30 px-4 py-2">
            <p className="font-handwritten flex items-center justify-center gap-2 text-2xl text-[#ffd6ea]">
              <FaHeart className="text-lg text-[#ff9bc7]" />
              Royal Indian Wedding
              <FaHeart className="text-lg text-[#ff9bc7]" />
            </p>
            <h1 className="mt-4 font-serif text-4xl font-semibold tracking-wide leading-tight text-[#fff7e4] drop-shadow-lg md:text-7xl">
              Varsha(Rohini) <FaHeart className="mx-2 inline text-[#ff9bc7]" /> Sai Kumar
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-center font-sans leading-relaxed text-[#fff3df] md:text-2xl">
              Two hearts, one forever
            </p>
          </div>
        </section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20"
          id="details"
        >
          <h2 className="section-title">📅 Wedding Details </h2>
          <div className="mx-auto mt-6 max-w-xs">
            <div className="heart-photo-wrap w-full max-w-[320px]">
              <img alt={couplePhotos.gallery[1].alt} className="h-auto w-full" loading="lazy" src={couplePhotos.gallery[1].src} />
            </div>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <Detail icon="📅" label="Date" value="29 April 2026" />
            <Detail icon="⏰" label="Time" value="11:45 AM" />
            <Detail icon="🪔" label="Muhurtham" value="Abhijith Lagnam" />
            <Detail icon="📍" label="Venue" value="Sri Vijayalaxmi Gardens" />
          </div>
          <p className="mt-6 text-center leading-relaxed text-[#8a3a62]">
            Vinayak Nagar, Pragathi Nagar, Nizamabad, Telangana 503003
          </p>
        </motion.section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20"
          id="countdown"
        >
          <h2 className="section-title">Countdown To Muhurtham ⏳</h2>
          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            {timeItems.map((item) => (
              <motion.div
                key={item.label}
                className="rounded-2xl border border-[#ff8fbc40] bg-white/80 p-6 text-center shadow-md transition hover:shadow-lg"
              >
                <p className="font-serif text-3xl font-semibold tracking-wide text-[#d63384]">{String(item.value).padStart(2, '0')}</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-xs uppercase tracking-[0.2em] text-[#8a3a62]">
                  <span>{item.icon}</span>
                  {item.label}
                </p>
              </motion.div>
            ))}
          </div>
          {hasArrived && (
            <motion.p
              animate={{ opacity: 1, scale: 1 }}
              className="mt-7 rounded-2xl bg-[#ffd3e7] p-4 text-center font-semibold text-[#a32967]"
              initial={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              The big day has arrived 💍✨
            </motion.p>
          )}
        </motion.section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20"
          id="story"
        >
          <h2 className="section-title">Our Love Story 💞</h2>
          <p className="mt-3 text-center text-base leading-relaxed text-[#8a3a62] md:text-lg">A journey written by destiny</p>
          <div className="relative mt-8 space-y-8 border-l border-[#ff8fbc80] pl-6">
            {storyTimeline.map((item) => (
              <div key={item.title} className="relative">
                <span className="absolute -left-[38px] top-0.5 flex h-8 w-8 items-center justify-center text-lg text-[#d24b8b]">🌸</span>
                <h3 className="font-serif text-2xl font-semibold tracking-wide text-gray-900">{item.title}</h3>
                <p className="mt-3 leading-relaxed text-[#8a3a62]">{item.text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20"
          id="family"
        >
          <h2 className="section-title">Families & Blessings 👨‍👩‍👧‍👦</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <BlessingCard title="Bride Side" names={['Kokkula Raghuveer', 'Late Lavanya','R/o. Nizamabad']} />
            <BlessingCard title="Groom Side" names={['Aita Vaikuntam', 'Kousalya', 'R/o. Nizamabad']} />
          </div>
        </motion.section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20"
          id="gallery"
        >
          <h2 className="section-title">Gallery 📸</h2>
          <p className="mt-3 text-center text-base leading-relaxed text-[#8a3a62] md:text-lg">Our moments, framed with love</p>
          <div className="mt-10 grid w-full max-w-5xl grid-cols-1 gap-8 sm:grid-cols-2">
            {couplePhotos.gallery.map((photo, index) => (
              <button
                className="group w-full text-left"
                key={photo.src}
                onClick={() => setSelectedImageIndex(index)}
                type="button"
              >
                <div className="heart-photo-wrap h-[260px] w-full transition duration-500 group-hover:scale-[1.01] md:h-[290px]">
                  <img
                    alt={photo.alt}
                    className="h-auto w-full transition duration-500 group-hover:scale-[1.02]"
                    loading="lazy"
                    src={photo.src}
                  />
                </div>
                <p className="mt-3 text-center text-base text-[#7a445f]">🖼️ {photo.caption}</p>
              </button>
            ))}
          </div>
        </motion.section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20"
          id="blessings"
        >
          <h2 className="section-title">Bless the Couple 🙏</h2>
          <form
            className="mt-7 grid gap-4 md:grid-cols-2"
            onSubmit={handleBlessingSubmit}
          >
            <Input
              label="Your Name"
              name="blessingName"
              onChange={(e) => setBlessingName(e.target.value)}
              placeholder="Enter your name"
              required
              value={blessingName}
            />
            <label className="text-left text-sm leading-relaxed text-[#8a3a62]" htmlFor="blessingMessage">
              Blessing Message
              <textarea
                className="mt-1 w-full rounded-xl border border-[#ff8fbc80] bg-[#fff8fc] p-3 outline-none transition focus:border-[#ff5ea1]"
                id="blessingMessage"
                onChange={(e) => setBlessingMessage(e.target.value)}
                placeholder="Write your blessing..."
                required
                rows="3"
                value={blessingMessage}
              />
            </label>
            <button
              className="md:col-span-2 rounded-full bg-[#ff5ea1] px-6 py-3 font-semibold text-white transition hover:bg-[#ff7ab4] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmittingBlessing}
              type="submit"
            >
              {isSubmittingBlessing ? 'Saving...' : editingBlessingId ? 'Update Blessing' : 'Add Blessing'}
            </button>
            {editingBlessingId && (
              <button
                className="md:col-span-2 rounded-full border border-[#ff8fbc80] bg-white px-6 py-3 font-semibold text-[#d63384] transition duration-300 hover:bg-[#fff3f9] hover:text-[#ff5ea1]"
                onClick={() => {
                  setEditingBlessingId(null)
                  setBlessingName('')
                  setBlessingMessage('')
                }}
                type="button"
              >
                Cancel Edit
              </button>
            )}
          </form>
          {blessingsError && <p className="mt-4 text-sm text-[#a32967]">{blessingsError}</p>}
          {isBlessingsLoading && <p className="mt-4 text-sm leading-relaxed text-[#8a3a62]">Loading blessings...</p>}
          {!isBlessingsLoading && blessings.length === 0 && (
            <p className="mt-4 text-sm leading-relaxed text-[#8a3a62]">No blessings yet. Be the first to add one.</p>
          )}
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {blessings.map((entry, index) => {
              const canEdit = Boolean(entry.editable) || ownedBlessingIds.includes(entry.id)
              return (
              <motion.div
                key={entry.id ?? `${entry.name}-${index}`}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-[#ffb1d1] bg-[#fff9fd] p-4 shadow-md"
                initial={{ opacity: 0, y: 18 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <p className="font-serif text-xl font-semibold tracking-wide text-gray-900">{entry.name}</p>
                <p className="mt-3 leading-relaxed text-[#8a3a62]">💌 {entry.message}</p>
                {canEdit && (
                  <button
                    className="mt-3 rounded-full border border-[#ff8fbc80] px-3 py-1 text-sm font-semibold text-[#d63384] transition duration-300 hover:bg-[#ffeef7] hover:text-[#ff5ea1]"
                    onClick={() => startEditingBlessing(entry)}
                    type="button"
                  >
                    Edit
                  </button>
                )}
              </motion.div>
              )
            })}
          </div>
          {hasMoreBlessings && (
            <div className="mt-6 text-center">
              <button
                className="rounded-full border border-[#ff8fbc80] bg-white px-6 py-2 font-semibold text-[#d63384] transition duration-300 hover:bg-[#fff3f9] hover:text-[#ff5ea1] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isLoadingMoreBlessings}
                onClick={loadMoreBlessings}
                type="button"
              >
                {isLoadingMoreBlessings ? 'Loading...' : 'Load More Blessings'}
              </button>
            </div>
          )}
        </motion.section>

        <motion.section
          {...sectionMotionProps}
          className="section-card section-card-heart mt-20 mb-6 md:mb-8"
          id="location"
        >
          <h2 className="section-title">Venue Location 🗺️</h2>
          <div className="mt-8 rounded-2xl border border-[#ff8fbc80] bg-[#fff8fc] p-4 shadow-lg">
            <iframe
              allowFullScreen=""
              className="w-full rounded-xl border-0"
              height="400"
              loading="lazy"
              src="https://www.google.com/maps?q=Sri+Vijayalaxmi+Gardens+Nizamabad&output=embed"
              title="Sri Vijayalaxmi Gardens Map"
              width="100%"
            />
            <button
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#ff5ea1] px-5 py-2 font-semibold text-white transition hover:bg-[#ff7ab4]"
              onClick={() => window.open('https://maps.app.goo.gl/uirDQfAH9wor5f8u8', '_blank')}
              type="button"
            >
              <FaMapMarkerAlt />
              📍 Get Directions
            </button>
            <p className="mt-3 text-sm leading-relaxed text-[#8a3a62]">Tap to navigate directly via Google Maps</p>
            <p className="text-sm leading-relaxed text-[#8a3a62]">5 mins from Reliance Mall</p>
            <p className="text-sm leading-relaxed text-[#8a3a62]">Parking available</p>
          </div>
        </motion.section>
      </main>

      <motion.footer
        className="relative overflow-hidden border-t border-[#ff8fbc80] bg-[#fff1f7] px-4 py-6 text-center md:py-8"
        initial={{ opacity: 0, y: 18 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        viewport={{ once: true, amount: 0.4 }}
        whileInView={{ opacity: 1, y: 0 }}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-t from-pink-100/60 to-transparent" />
        <div className="relative mx-auto max-w-3xl">
          <p className="font-serif flex items-center justify-center gap-2 text-lg font-semibold tracking-wide text-[#d63384]">
            ✨ With love, families invite you to celebrate
          </p>
        </div>
      </motion.footer>

      {activeImage && (
        <div
          className="fixed inset-0 z-[80] grid place-items-center bg-black/85 p-4"
          onClick={() => setSelectedImageIndex(null)}
          role="presentation"
        >
          <button
            className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white"
            onClick={(event) => {
              event.stopPropagation()
              setSelectedImageIndex((prev) => (prev === null ? prev : (prev - 1 + couplePhotos.gallery.length) % couplePhotos.gallery.length))
            }}
            type="button"
          >
            <FaChevronLeft />
          </button>
          <motion.div
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-[92vw] text-center"
            initial={{ scale: 0.93, opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <img
              alt={activeImage.alt}
              className="max-h-[82vh] w-auto max-w-[92vw] rounded-2xl border-2 border-[#ff8fbc] shadow-[0_0_0_4px_rgba(255,143,188,0.2)]"
              src={activeImage.src}
            />
            <p className="mt-3 text-lg text-white">{activeImage.caption}</p>
          </motion.div>
          <button
            className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-white/20 p-3 text-white"
            onClick={(event) => {
              event.stopPropagation()
              setSelectedImageIndex((prev) => (prev === null ? prev : (prev + 1) % couplePhotos.gallery.length))
            }}
            type="button"
          >
            <FaChevronRight />
          </button>
          <button
            className="absolute right-5 top-5 rounded-full bg-white/20 p-3 text-white"
            onClick={(event) => {
              event.stopPropagation()
              setSelectedImageIndex(null)
            }}
            type="button"
          >
            <FaTimes />
          </button>
        </div>
      )}
    </div>
  )
}

function Detail({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-[#ff8fbc40] bg-white/80 p-6 text-center shadow-md transition hover:shadow-lg">
      <p className="flex items-center justify-center gap-1 text-xs uppercase tracking-[0.2em] text-[#8a3a62]">
        <span>{icon}</span>
        {label}
      </p>
      <p className="mt-3 font-serif text-2xl font-semibold tracking-wide text-gray-900">{value}</p>
    </div>
  )
}

function BlessingCard({ title, names }) {
  return (
    <div className="rounded-2xl border border-[#ff8fbc40] bg-white/80 p-6 text-center shadow-md transition hover:shadow-lg">
      <h3 className="font-serif text-[1.6rem] font-semibold tracking-wide text-gray-900">🌿 {title}</h3>
      <div className="mt-4 space-y-1.5 text-base leading-relaxed text-[#8a3a62] md:text-lg">
        {names.map((name, index) => (
          <p key={name} className={index === 0 ? 'font-medium text-[#5f2e48]' : ''}>
            {name}
          </p>
        ))}
      </div>
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="text-left text-sm leading-relaxed text-[#8a3a62]" htmlFor={props.name}>
      {label}
      <input
        {...props}
        className="mt-1 w-full rounded-xl border border-[#ff8fbc80] bg-[#fff8fc] p-3 outline-none transition focus:border-[#ff5ea1]"
        id={props.name}
      />
    </label>
  )
}

export default App
