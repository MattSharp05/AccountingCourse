import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import { StudentLayout } from '../components/StudentLayout';
import { usePublicCourses, useEnrollments, useEnroll } from '../hooks';
import type { PublicCourse } from '../hooks/useStudentData';

// ── Scroll-animated section wrapper ─────────────────────

function FadeInSection({
  children,
  className = '',
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Main Page ───────────────────────────────────────────

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

  // Parallax for hero
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <StudentLayout>
      {isLoading ? (
        <div className="flex justify-center py-24">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400 font-medium tracking-wide">Loading your courses...</span>
          </div>
        </div>
      ) : (
        <div className="space-y-16 pb-12">
          {/* ── Hero Welcome ──────────────────────────── */}
          <motion.section
            ref={heroRef}
            style={{ y: heroY, opacity: heroOpacity }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-8 py-14 md:px-12 md:py-20"
          >
            {/* Decorative blurred circles */}
            <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-400/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-accent-400/15 rounded-full blur-3xl" />

            <div className="relative z-10 max-w-2xl">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-3xl md:text-5xl font-extrabold font-display text-white leading-tight tracking-tight"
              >
                Welcome back.
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="mt-4 text-lg text-primary-100/80 max-w-lg leading-relaxed"
              >
                Pick up where you left off or discover new courses. Your progress is saved automatically.
              </motion.p>

              {/* Quick stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="mt-8 flex flex-wrap gap-6"
              >
                <StatBadge label="Enrolled" value={enrolledCourses.length} />
                <StatBadge label="Available" value={availableCourses.length} />
                <StatBadge label="Total Courses" value={courses?.length ?? 0} />
              </motion.div>
            </div>
          </motion.section>

          {/* ── Enrolled Courses ──────────────────────── */}
          <FadeInSection>
            <section>
              <SectionHeader
                title="Your Courses"
                subtitle="Continue where you left off"
              />

              {!enrolledCourses.length ? (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white py-12 text-center">
                  <p className="text-slate-400 text-sm">
                    You haven't enrolled in any courses yet. Browse below to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {enrolledCourses.map((course, i) => (
                    <FadeInSection key={course.id} delay={i * 0.08}>
                      <CourseCard
                        course={course}
                        onClick={() => navigate(`/course/${course.id}`)}
                      />
                    </FadeInSection>
                  ))}
                </div>
              )}
            </section>
          </FadeInSection>

          {/* ── Browse Courses ────────────────────────── */}
          {availableCourses.length > 0 && (
            <FadeInSection delay={0.1}>
              <section>
                <SectionHeader
                  title="Discover Courses"
                  subtitle="Enroll in new courses to start learning"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {availableCourses.map((course, i) => (
                    <FadeInSection key={course.id} delay={i * 0.08}>
                      <BrowseCourseCard
                        course={course}
                        enrolling={enrollingId === course.id}
                        onEnroll={(e) => handleEnroll(e, course.id)}
                        onClick={() => navigate(`/course/${course.id}`)}
                      />
                    </FadeInSection>
                  ))}
                </div>
              </section>
            </FadeInSection>
          )}

          {/* ── Features Showcase ─────────────────────── */}
          <FadeInSection delay={0.15}>
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Interactive 3D Maps"
                description="Navigate immersive learning worlds with your own avatar. Explore content at your own pace."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                }
                title="Earn XP & Level Up"
                description="Gain experience points for every lesson. Track your progress and unlock achievements."
              />
              <FeatureCard
                icon={
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                }
                title="Boss Battles"
                description="Test your knowledge against quiz bosses. Defeat them to prove your mastery."
              />
            </section>
          </FadeInSection>

          {/* Fully empty — no courses at all */}
          {!courses?.length && <EmptyState />}
        </div>
      )}
    </StudentLayout>
  );
}

// ── Sub-components ──────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold font-display text-slate-900 tracking-tight">
        {title}
      </h2>
      <p className="text-sm text-slate-400 mt-1">
        {subtitle}
      </p>
    </div>
  );
}

function StatBadge({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl px-5 py-3">
      <span className="text-2xl font-bold text-white">{value}</span>
      <span className="text-xs text-primary-200 uppercase tracking-wider font-medium">{label}</span>
    </div>
  );
}

function CourseCard({
  course,
  onClick,
}: {
  course: PublicCourse;
  onClick: () => void;
}) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 cursor-pointer transition-shadow overflow-hidden"
    >
      {/* Color accent bar */}
      <div className="h-1.5 w-full bg-gradient-to-r from-primary-500 to-primary-600" />

      <div className="p-6">
        <h3 className="text-lg font-bold font-display text-slate-900 leading-tight line-clamp-2 mb-3 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>

        <p className="text-sm text-slate-400 mb-5 line-clamp-3 leading-relaxed">
          {course.description || 'No description available.'}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <span className="text-xs text-slate-400 font-medium">
            {course.professorName}
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            {course.moduleCount} {course.moduleCount === 1 ? 'module' : 'modules'}
          </div>
        </div>
      </div>
    </motion.div>
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
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-slate-100 cursor-pointer transition-shadow overflow-hidden"
    >
      <div className="h-1.5 w-full bg-gradient-to-r from-slate-200 to-slate-300" />

      <div className="p-6">
        <h3 className="text-lg font-bold font-display text-slate-900 leading-tight line-clamp-2 mb-3 group-hover:text-primary-600 transition-colors">
          {course.title}
        </h3>

        <p className="text-sm text-slate-400 mb-5 line-clamp-3 leading-relaxed">
          {course.description || 'No description available.'}
        </p>

        <div className="flex items-center justify-between pt-4 border-t border-slate-50">
          <span className="text-xs text-slate-400 font-medium">
            {course.professorName}
          </span>
          <button
            onClick={onEnroll}
            disabled={enrolling}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-primary-600 text-white rounded-xl hover:bg-primary-700 disabled:opacity-50 transition-all hover:shadow-md"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {enrolling ? 'Enrolling...' : 'Enroll'}
          </button>
        </div>
      </div>
    </motion.div>
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
    <motion.div
      whileHover={{ y: -4 }}
      className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-lg transition-shadow"
    >
      <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-base font-bold font-display text-slate-900 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-400 leading-relaxed">
        {description}
      </p>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <FadeInSection>
      <div className="flex flex-col items-center justify-center py-24 px-4">
        <div className="w-20 h-20 mb-6 rounded-2xl bg-slate-50 flex items-center justify-center">
          <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>
        <h3 className="text-xl font-bold font-display text-slate-700 mb-2">
          No courses available yet
        </h3>
        <p className="text-slate-400 text-center max-w-sm">
          Check back soon. Your instructors are building new content.
        </p>
      </div>
    </FadeInSection>
  );
}

export default Home;
