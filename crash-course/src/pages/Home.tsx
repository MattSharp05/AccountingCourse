import { useNavigate } from 'react-router-dom';
import { BookOpen, ChevronRight, Sparkles, Plus, GraduationCap } from 'lucide-react';
import { StudentLayout } from '../components/StudentLayout';
import { usePublicCourses, useEnrollments, useEnroll } from '../hooks';
import type { PublicCourse } from '../hooks/useStudentData';
import {
  FadeIn,
  RevealOnScroll,
  StaggerList,
  StaggerItem,
  BrandButton,
} from '../components/ui';

export function Home() {
  const navigate = useNavigate();
  const { data: courses, isLoading: coursesLoading } = usePublicCourses();
  const { data: enrolledIds, isLoading: enrollmentsLoading } = useEnrollments();
  const enrollMutation = useEnroll();

  const isLoading = coursesLoading || enrollmentsLoading;
  const enrolledCourses = (courses || []).filter((c) => enrolledIds?.includes(c.id));
  const availableCourses = (courses || []).filter((c) => !enrolledIds?.includes(c.id));
  const enrollingId = enrollMutation.isPending ? enrollMutation.variables : null;

  const handleEnroll = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    enrollMutation.mutate(courseId);
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex justify-center py-32">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-[#9ca3af] tracking-wide">Loading your courses...</span>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="space-y-24 pb-24">
        {/* ─── Hero welcome ─── */}
        <section className="relative overflow-hidden rounded-3xl bg-brand-dark-card border border-white/10 px-8 py-16 md:px-14 md:py-20 shadow-2xl shadow-black/40">
          {/* Ambient radial glow */}
          <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-brand-accent/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-brand-primary/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl">
            <FadeIn y={12} delay={0.05}>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-4">
                Welcome back
              </p>
            </FadeIn>
            <FadeIn y={16} delay={0.15}>
              <h1 className="font-display text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight text-white">
                Pick up where you <span className="gradient-text">left off.</span>
              </h1>
            </FadeIn>
            <FadeIn y={16} delay={0.3}>
              <p className="mt-6 text-lg text-[#9ca3af] leading-relaxed max-w-xl">
                Your adventure map, your progress, your pace. Every checkpoint
                is saved automatically — jump back in anywhere.
              </p>
            </FadeIn>

            <FadeIn y={16} delay={0.45}>
              <div className="mt-10 flex flex-wrap gap-5">
                <StatBadge label="Enrolled" value={enrolledCourses.length} />
                <StatBadge label="Available" value={availableCourses.length} />
                <StatBadge label="Total" value={courses?.length ?? 0} />
              </div>
            </FadeIn>
          </div>
        </section>

        {/* ─── Your courses ─── */}
        <RevealOnScroll>
          <section>
            <SectionHeader
              eyebrow="Your courses"
              title="Continue the adventure"
            />

            {!enrolledCourses.length ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-brand-dark-card/50 py-16 text-center">
                <p className="text-[#9ca3af] text-sm">
                  You haven&apos;t enrolled in any courses yet. Browse below to get started.
                </p>
              </div>
            ) : (
              <StaggerList className="spotlight-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {enrolledCourses.map((course) => (
                  <StaggerItem key={course.id}>
                    <CourseCard
                      course={course}
                      onClick={() => navigate(`/course/${course.id}`)}
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            )}
          </section>
        </RevealOnScroll>

        {/* ─── Browse courses ─── */}
        {availableCourses.length > 0 && (
          <RevealOnScroll>
            <section>
              <SectionHeader
                eyebrow="Discover"
                title="New courses to enroll in"
              />

              <StaggerList className="spotlight-cards grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {availableCourses.map((course) => (
                  <StaggerItem key={course.id}>
                    <BrowseCourseCard
                      course={course}
                      enrolling={enrollingId === course.id}
                      onEnroll={(e) => handleEnroll(e, course.id)}
                      onClick={() => navigate(`/course/${course.id}`)}
                    />
                  </StaggerItem>
                ))}
              </StaggerList>
            </section>
          </RevealOnScroll>
        )}

        {/* ─── Features showcase ─── */}
        <RevealOnScroll>
          <section>
            <SectionHeader
              eyebrow="Why it works"
              title="Learning, reimagined"
            />
            <StaggerList className="spotlight-cards grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              <StaggerItem>
                <FeatureCard
                  icon={<BookOpen className="w-5 h-5" />}
                  title="Interactive 3D Maps"
                  description="Navigate immersive learning worlds with your own avatar. Explore content at your own pace."
                />
              </StaggerItem>
              <StaggerItem>
                <FeatureCard
                  icon={<Sparkles className="w-5 h-5" />}
                  title="Earn XP & level up"
                  description="Gain experience points for every lesson. Track progress and unlock achievements."
                />
              </StaggerItem>
              <StaggerItem>
                <FeatureCard
                  icon={<GraduationCap className="w-5 h-5" />}
                  title="Boss battles"
                  description="Test your knowledge against quiz bosses. Defeat them to prove your mastery."
                />
              </StaggerItem>
            </StaggerList>
          </section>
        </RevealOnScroll>

        {!courses?.length && <EmptyState />}
      </div>
    </StudentLayout>
  );
}

// ─── Subcomponents ───

function SectionHeader({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-accent mb-3">
        {eyebrow}
      </p>
      <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight leading-[1.1]">
        {title}
      </h2>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-3">
      <span className="font-display text-3xl font-bold text-brand-accent">{value}</span>
      <span className="text-xs text-[#9ca3af] uppercase tracking-[0.2em] font-medium">
        {label}
      </span>
    </div>
  );
}

function CourseCard({ course, onClick }: { course: PublicCourse; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="card-glow group bg-brand-dark-card rounded-2xl overflow-hidden cursor-pointer"
    >
      <div className="h-1 w-full bg-gradient-to-r from-brand-accent to-brand-accent-dark" />
      <div className="p-7">
        <div className="w-11 h-11 rounded-xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center mb-5">
          <BookOpen className="w-5 h-5 text-brand-accent" />
        </div>
        <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 mb-3 group-hover:text-brand-accent transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-[#9ca3af] mb-6 line-clamp-3 leading-relaxed">
          {course.description || 'No description available.'}
        </p>
        <div className="flex items-center justify-between pt-5 border-t border-white/5">
          <span className="text-xs text-[#9ca3af] font-medium">
            {course.professorName}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-[#9ca3af]">
            {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
            <ChevronRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowseCourseCard({
  course,
  enrolling,
  onEnroll,
  onClick,
}: {
  course: PublicCourse;
  enrolling: boolean;
  onEnroll: (e: React.MouseEvent) => void;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="card-glow group bg-brand-dark-card rounded-2xl overflow-hidden cursor-pointer"
    >
      <div className="h-1 w-full bg-gradient-to-r from-white/10 to-white/5" />
      <div className="p-7">
        <div className="w-11 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mb-5">
          <Sparkles className="w-5 h-5 text-white/70" />
        </div>
        <h3 className="text-xl font-bold text-white leading-tight line-clamp-2 mb-3 group-hover:text-brand-accent transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-[#9ca3af] mb-6 line-clamp-3 leading-relaxed">
          {course.description || 'No description available.'}
        </p>
        <div className="flex items-center justify-between pt-5 border-t border-white/5">
          <span className="text-xs text-[#9ca3af] font-medium">
            {course.professorName}
          </span>
          <BrandButton
            size="sm"
            variant="primary"
            onClick={onEnroll}
            isLoading={enrolling}
            leftIcon={!enrolling ? <Plus className="w-3.5 h-3.5" /> : undefined}
          >
            {enrolling ? 'Enrolling' : 'Enroll'}
          </BrandButton>
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="card-glow bg-brand-dark-card rounded-2xl p-7">
      <div className="w-12 h-12 rounded-xl bg-brand-accent/10 border border-brand-accent/20 text-brand-accent flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-[#9ca3af] leading-relaxed">{description}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <RevealOnScroll>
      <div className="flex flex-col items-center justify-center py-32 px-4">
        <div className="w-20 h-20 mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <BookOpen className="w-10 h-10 text-[#6b7280]" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No courses available yet</h3>
        <p className="text-[#9ca3af] text-center max-w-sm">
          Check back soon. Your instructors are building new content.
        </p>
      </div>
    </RevealOnScroll>
  );
}

export default Home;
