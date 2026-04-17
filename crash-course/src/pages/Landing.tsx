import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Map as MapIcon,
  Sparkles,
  Trophy,
  Compass,
  MessageSquareText,
  Target,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import {
  BeamsBackground,
  BrandButton,
  FadeIn,
  RevealOnScroll,
  StaggerList,
  StaggerItem,
  ContainerScroll,
  CardSticky,
} from '../components/ui';

const STEPS = [
  {
    num: '01',
    title: 'Step into the adventure map',
    desc: 'Your course is laid out as a 3D world. Each checkpoint is a location you can walk up to, explore, and interact with — no static syllabus.',
    icon: Compass,
  },
  {
    num: '02',
    title: 'Complete checkpoints to level up',
    desc: 'Read chapters, watch lectures, and pass short quizzes to unlock the next leg of the map. Progress is tracked per checkpoint, per chapter.',
    icon: Target,
  },
  {
    num: '03',
    title: 'Ask Professor Marrs anything',
    desc: 'Stuck on accruals? Confused on a journal entry? Our in-world AI tutor knows every slide, PDF, and lesson in your current map and answers in context.',
    icon: MessageSquareText,
  },
  {
    num: '04',
    title: 'Earn your way to the final boss',
    desc: 'Finish the course by defeating the capstone: a full financial-statement challenge using everything you learned along the way.',
    icon: Trophy,
  },
];

const OUTCOMES = [
  {
    title: 'Debits & credits, finally intuitive',
    desc: 'Build the reflex on real transactions — not just flashcards.',
    icon: BookOpen,
  },
  {
    title: 'Read any financial statement',
    desc: 'Balance sheet, income statement, cash flows — confidently.',
    icon: MapIcon,
  },
  {
    title: 'Close the books, period by period',
    desc: 'Adjustments, closing entries, and the full accounting cycle.',
    icon: Sparkles,
  },
  {
    title: 'Ready for Accounting 201',
    desc: 'You finish this course prepared for intermediate accounting.',
    icon: GraduationCap,
  },
];

const STATS = [
  { value: '6', label: 'Modules' },
  { value: '40+', label: 'Checkpoints' },
  { value: '3D', label: 'Adventure map' },
  { value: '24/7', label: 'AI tutor' },
];

export function Landing() {
  const navigate = useNavigate();
  const goSignIn = () => navigate('/login');

  return (
    <div className="min-h-screen bg-brand-dark text-white">
      {/* ─── Header ─── */}
      <header className="fixed top-0 left-0 right-0 bg-brand-dark/95 backdrop-blur-sm border-b border-white/5 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-accent-dark flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-brand-dark" />
              </div>
              <span className="font-semibold tracking-tight">Crash Course</span>
            </div>
            <nav className="hidden md:flex items-center gap-2">
              <a href="#how" className="px-4 py-2 rounded-full text-sm text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors">How it works</a>
              <a href="#outcomes" className="px-4 py-2 rounded-full text-sm text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors">What you&apos;ll learn</a>
              <a href="#preview" className="px-4 py-2 rounded-full text-sm text-[#9ca3af] hover:text-white hover:bg-white/5 transition-colors">The map</a>
            </nav>
            <BrandButton variant="primary" size="sm" onClick={goSignIn}>
              Sign in
            </BrandButton>
          </div>
        </div>
      </header>

      {/* ─── Hero ─── */}
      <BeamsBackground className="pt-16" intensity="strong">
        <section className="relative py-32 md:py-48">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <FadeIn y={16} delay={0.1}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-6">
                Accounting Adventure Course
              </p>
            </FadeIn>

            <FadeIn y={20} delay={0.25}>
              <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold leading-[1.05] tracking-tight">
                Learn accounting
                <br />
                by <span className="gradient-text">adventuring</span> through it.
              </h1>
            </FadeIn>

            <FadeIn y={20} delay={0.4}>
              <p className="mt-8 text-lg md:text-xl text-[#9ca3af] max-w-2xl mx-auto leading-relaxed">
                A full intro-accounting course, rebuilt as an explorable 3D world.
                Walk checkpoint to checkpoint. Chat with an in-world tutor. Leave the
                semester actually understanding the books.
              </p>
            </FadeIn>

            <FadeIn y={20} delay={0.55}>
              <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
                <BrandButton
                  variant="primary"
                  size="lg"
                  glow
                  onClick={goSignIn}
                  rightIcon={<ChevronRight className="w-4 h-4" />}
                >
                  Start the course
                </BrandButton>
                <BrandButton variant="outline" size="lg" onClick={() => {
                  document.getElementById('preview')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  See the map
                </BrandButton>
              </div>
            </FadeIn>

            <FadeIn y={20} delay={0.7}>
              <p className="mt-8 text-sm text-[#6b7280]">
                Built for Accounting 101 · No prior experience needed
              </p>
            </FadeIn>
          </div>
        </section>

        {/* ─── Stats strip ─── */}
        <section className="relative border-y border-white/5 bg-brand-dark/50">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-white/5">
              {STATS.map((stat, i) => (
                <RevealOnScroll
                  key={stat.label}
                  delay={i * 0.08}
                  className="py-10 px-6 text-center"
                >
                  <div className="font-display text-4xl md:text-5xl font-bold text-brand-accent">
                    {stat.value}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] text-[#9ca3af]">
                    {stat.label}
                  </div>
                </RevealOnScroll>
              ))}
            </div>
          </div>
        </section>
      </BeamsBackground>

      {/* ─── Adventure Map Preview ─── */}
      <section id="preview" className="relative py-24 md:py-32">
        <div className="section-divider" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-4">
              The adventure map
            </p>
            <h2 className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              A world you can actually <span className="gradient-text">walk through</span>
            </h2>
            <p className="mt-5 text-lg text-[#9ca3af] leading-relaxed">
              Each module of the course is a region. Each chapter, a path. Each
              checkpoint, a place you stand in front of and interact with.
            </p>
          </RevealOnScroll>

          <RevealOnScroll>
            <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-brand-dark-card shadow-2xl shadow-black/40 aspect-video">
              {/* TODO: Replace with video or screenshot of the adventure map.
                  <video> or <img> here. */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-brand-dark-card via-brand-dark-lighter to-brand-dark">
                <div className="text-center">
                  <MapIcon className="w-12 h-12 text-brand-accent/60 mx-auto mb-4" />
                  <p className="text-sm uppercase tracking-[0.2em] text-[#9ca3af]">
                    Adventure map preview
                  </p>
                  <p className="text-xs text-[#6b7280] mt-2">
                    Drop a screenshot or video loop here
                  </p>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── How it works (sticky-stack) ─── */}
      <section id="how" className="relative py-24 md:py-32">
        <div className="section-divider" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-2 md:gap-16">
          {/* Sticky intro column */}
          <div className="md:sticky md:top-24 md:self-start md:h-fit mb-12 md:mb-0">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-4">
              How it works
            </p>
            <h2 className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              From opening the app to <span className="gradient-text">your final boss</span>
            </h2>
            <p className="mt-6 text-lg text-[#9ca3af] leading-relaxed">
              The whole course is structured around one loop: explore the map,
              finish the checkpoint, unlock the next leg. Here&apos;s how a week looks.
            </p>
          </div>

          {/* Stacking cards */}
          <ContainerScroll className="space-y-6 md:space-y-8 md:pb-32">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <CardSticky
                  key={step.num}
                  index={i}
                  baseOffset={96}
                  incrementY={16}
                  className="rounded-2xl bg-brand-dark-card border border-white/10 p-8 md:p-10 shadow-2xl shadow-black/40"
                >
                  <div className="relative">
                    <span
                      className="font-display text-[6rem] font-bold leading-none text-white/[0.04] absolute -top-6 -left-2 select-none pointer-events-none"
                      aria-hidden
                    >
                      {step.num}
                    </span>
                    <div className="relative z-10">
                      <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mb-5">
                        <Icon className="h-5 w-5 text-brand-accent" />
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold tracking-tight">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-[#9ca3af] leading-relaxed">
                        {step.desc}
                      </p>
                    </div>
                  </div>
                </CardSticky>
              );
            })}
          </ContainerScroll>
        </div>
      </section>

      {/* ─── What you'll learn ─── */}
      <section id="outcomes" className="relative py-24 md:py-32">
        <div className="section-divider" />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <RevealOnScroll className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-4">
              What you&apos;ll learn
            </p>
            <h2 className="text-3xl md:text-5xl font-bold leading-[1.1] tracking-tight">
              Walk out able to <span className="gradient-text">actually read the books</span>
            </h2>
          </RevealOnScroll>

          <StaggerList className="spotlight-cards grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            {OUTCOMES.map((o) => {
              const Icon = o.icon;
              return (
                <StaggerItem
                  key={o.title}
                  className="card-glow bg-brand-dark-card rounded-2xl p-8"
                >
                  <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mb-5">
                    <Icon className="h-5 w-5 text-brand-accent" />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight">{o.title}</h3>
                  <p className="mt-2 text-[#9ca3af] leading-relaxed">{o.desc}</p>
                </StaggerItem>
              );
            })}
          </StaggerList>
        </div>
      </section>

      {/* ─── Final CTA with ambient glow ─── */}
      <section className="relative py-32 md:py-40">
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-[500px] h-[500px] rounded-full bg-brand-accent/5 blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <RevealOnScroll>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-4">
              Your move
            </p>
            <h2 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Ready to <span className="gradient-text">begin the adventure?</span>
            </h2>
            <p className="mt-6 text-lg text-[#9ca3af] leading-relaxed max-w-xl mx-auto">
              Sign in with your student email and load into the first map.
              You&apos;ll be taking your first journal entry inside of five minutes.
            </p>
            <div className="mt-10 flex justify-center">
              <BrandButton
                variant="primary"
                size="lg"
                glow
                onClick={goSignIn}
                rightIcon={<ChevronRight className="w-4 h-4" />}
              >
                Start the course
              </BrandButton>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-brand-accent to-brand-accent-dark flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-brand-dark" />
            </div>
            <span className="text-sm text-[#9ca3af]">Crash Course · Accounting Adventure</span>
          </div>
          <p className="text-xs text-[#6b7280]">© {new Date().getFullYear()} Crash Course. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default Landing;
