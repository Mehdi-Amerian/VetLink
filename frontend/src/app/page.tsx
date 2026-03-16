'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Nunito_Sans, Sora } from 'next/font/google';

import { useAuth } from '@/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const heading = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

const body = Nunito_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const ONBOARDING_EMAIL = 'onboarding@vetlink.fi';
const NAV_SECTIONS = [
  { id: 'roles', label: 'Roles' },
  { id: 'flow', label: 'How It Works' },
  { id: 'final-cta', label: 'Get Started' },
] as const;

type NavSectionId = (typeof NAV_SECTIONS)[number]['id'];

type RoleCard = {
  title: string;
  audience: string;
  points: string[];
  ctaLabel: string;
  ctaHref: string;
};

const roleCards: RoleCard[] = [
  {
    title: 'Pet Owners',
    audience: 'Fast booking with less back and forth.',
    points: [
      'Book appointments in seconds',
      'See upcoming and past visits clearly',
      'Manage pets and visit history in one place',
    ],
    ctaLabel: 'Create Owner Account',
    ctaHref: '/signup',
  },
  {
    title: 'Vets',
    audience: 'A schedule you can trust at a glance.',
    points: [
      'Upcoming appointments in calendar view',
      'Historical records ready for follow-up',
      'Availability management built into profile',
    ],
    ctaLabel: 'Log In',
    ctaHref: '/login',
  },
  {
    title: 'Clinic Admins',
    audience: 'Run operations without spreadsheet chaos.',
    points: [
      'Invite and manage clinic team members',
      'Keep capacity, slots, and appointments aligned',
      'Operational visibility across your clinic',
    ],
    ctaLabel: 'Log In',
    ctaHref: '/login',
  },
];

function BrandWordmark({ size = 'md' }: { size?: 'md' | 'sm' }) {
  const dimensions =
    size === 'sm'
      ? 'h-[19px] w-[76px] sm:h-[22px] sm:w-[88px]'
      : 'h-[43px] w-[168px] sm:h-[48px] sm:w-[192px]'

  return (
    <div className={`relative ${dimensions}`}>
      <Image
        src="/vetlink-logo.png"
        alt="VetLink"
        fill
        priority={size === 'md'}
        sizes={
          size === 'md'
            ? '(max-width: 640px) 280px, 320px'
            : '(max-width: 640px) 190px, 220px'
        }
        className="object-cover"
      />
    </div>
  );
}

function DashboardPreview() {
  return (
    <Card className="relative overflow-hidden border-[#103857]/20 bg-white/90 shadow-xl backdrop-blur">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#103857] via-[#1d5f84] to-[#47a6b2]" />
      <CardContent className="space-y-4 px-5 py-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#1d5f84]">
            Live board preview
          </p>
          <span className="rounded-full bg-[#eff6f7] px-2 py-1 text-xs font-semibold text-[#1d5f84]">
            Monday
          </span>
        </div>

        <div className="rounded-xl border border-[#d9e8ee] bg-[#f7fbfc] p-3">
          <p className={`${heading.className} text-sm font-bold text-[#103857]`}>Upcoming</p>
          <div className="mt-2 space-y-2 text-sm text-[#20465f]">
            <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
              <span>09:30 - Bella (Vaccination)</span>
              <span className="text-xs text-[#5c8093]">Dr. Evans</span>
            </div>
            <div className="flex items-center justify-between rounded-md bg-white px-2 py-1.5">
              <span>11:00 - Milo (Skin check)</span>
              <span className="text-xs text-[#5c8093]">Dr. Cho</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#e4eaef] bg-white p-3">
          <p className={`${heading.className} text-sm font-bold text-[#103857]`}>History</p>
          <div className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 text-sm text-[#2e5469]">
            <span>Rocky - Dental cleaning</span>
            <span className="text-xs text-[#6e8b9b]">Completed</span>
            <span>Luna - Follow-up exam</span>
            <span className="text-xs text-[#6e8b9b]">Completed</span>
            <span>Coco - Surgery consult</span>
            <span className="text-xs text-[#6e8b9b]">Cancelled</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const scrollRootRef = useRef<HTMLElement | null>(null);
  const [activeSection, setActiveSection] = useState<NavSectionId | null>(null);

  function scrollToSection(id: string) {
    const target = document.getElementById(id);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToTop() {
    if (scrollRootRef.current) {
      scrollRootRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root) return;

    const targets = NAV_SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as Element[];
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);

        if (visible.length === 0) return;

        const id = visible[0].target.id as NavSectionId;
        setActiveSection(id);
      },
      {
        root,
        threshold: [0.2, 0.35, 0.5, 0.7],
      }
    );

    targets.forEach((target) => observer.observe(target));

    const onScroll = () => {
      if (root.scrollTop < 80) {
        setActiveSection(null);
      }
    };

    root.addEventListener('scroll', onScroll);

    return () => {
      observer.disconnect();
      root.removeEventListener('scroll', onScroll);
    };
  }, []);

  useEffect(() => {
    if (!ready || !user) return;

    switch (user.role) {
      case 'OWNER':
        router.replace('/dashboard/owner');
        break;
      case 'VET':
        router.replace('/dashboard/vet');
        break;
      case 'CLINIC_ADMIN':
        router.replace('/dashboard/clinic-admin');
        break;
      case 'SUPER_ADMIN':
        router.replace('/dashboard/super-admin');
        break;
      default:
        router.replace('/login');
    }
  }, [user, ready, router]);

  return (
    <main
      ref={scrollRootRef}
      className={`${body.className} relative h-screen overflow-y-auto overflow-x-hidden bg-[#f8f5ef] text-[#102f46]`}
    >
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#c9e8e4]/70 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-48 h-96 w-96 rounded-full bg-[#d8e2f2]/70 blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-120px] left-1/2 h-80 w-[38rem] -translate-x-1/2 rounded-full bg-[#d5ebf3]/70 blur-3xl" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="rounded-xl transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#103857]/50 active:scale-[0.98]"
        >
          <BrandWordmark />
        </button>

        <div className="hidden items-center gap-7 text-sm font-semibold text-[#35556a] md:flex">
          {NAV_SECTIONS.map((section) => {
            const active = activeSection === section.id;

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => scrollToSection(section.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative rounded-md px-1 py-1 transition-all duration-200 hover:text-[#103857] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#103857]/50 ${
                  active ? 'text-[#103857]' : 'text-[#35556a]'
                }`}
              >
                {section.label}
                <span
                  className={`absolute -bottom-1 left-0 h-[2px] rounded-full bg-[#103857] transition-all duration-200 ${
                    active ? 'w-full opacity-100' : 'w-0 opacity-0'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="border-[#103857]/25 bg-white/70 text-[#103857]">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild size="sm" className="bg-[#103857] text-white hover:bg-[#0e2f48]">
            <Link href="/signup">Sign up</Link>
          </Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-6xl gap-10 px-6 pb-10 pt-4 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div>
          <p
            className="inline-flex items-center rounded-full border border-[#103857]/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#1f5778]"
            style={{ animation: 'riseIn 700ms ease-out both' }}
          >
            Veterinary Booking Platform
          </p>
          <h1
            className={`${heading.className} mt-4 max-w-xl text-4xl font-extrabold leading-[1.05] text-[#103857] sm:text-5xl lg:text-6xl`}
            style={{ animation: 'riseIn 850ms ease-out both' }}
          >
            Veterinary booking that finally feels organized.
          </h1>
          <p
            className="mt-5 max-w-xl text-lg leading-relaxed text-[#33556b]"
            style={{ animation: 'riseIn 980ms ease-out both' }}
          >
            VetLink keeps owners, vets, and clinics in sync with clear upcoming schedules, reliable history,
            and role-based dashboards that reduce booking chaos.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3" style={{ animation: 'riseIn 1100ms ease-out both' }}>
            <Button asChild size="lg" className="bg-[#103857] px-6 text-white hover:bg-[#0e2f48]">
              <Link href="/signup">Book as Pet Owner</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-[#103857]/25 bg-white/75 px-6 text-[#103857] hover:bg-white"
            >
              <Link href="/login">Log In</Link>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap gap-2 text-sm font-semibold text-[#3b6278]" style={{ animation: 'riseIn 1240ms ease-out both' }}>
            <span className="rounded-full border border-[#bdd7e0] bg-white/80 px-3 py-1">One shared login for all users</span>
            <span className="rounded-full border border-[#bdd7e0] bg-white/80 px-3 py-1">Upcoming + History views</span>
            <span className="rounded-full border border-[#bdd7e0] bg-white/80 px-3 py-1">Invite-based staff access</span>
          </div>
        </div>

        <div style={{ animation: 'riseIn 1100ms ease-out both' }}>
          <div className="relative">
            <div className="absolute -inset-5 -z-10 rounded-[2rem] bg-gradient-to-br from-[#2f6f8f]/30 via-[#77bac7]/20 to-[#f8f5ef] blur-xl" />
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section id="roles" className="relative z-10 mx-auto w-full max-w-6xl px-6 py-12">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2a6a83]">Who VetLink Serves</p>
          <h2 className={`${heading.className} mt-2 text-3xl font-extrabold text-[#103857] sm:text-4xl`}>
            One platform, three focused experiences.
          </h2>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {roleCards.map((card, index) => (
            <Card
              key={card.title}
              className="border-[#103857]/12 bg-white/85 py-0 shadow-md backdrop-blur"
              style={{ animation: `riseIn 700ms ease-out ${120 * index}ms both` }}
            >
              <CardContent className="space-y-4 p-5">
                <div>
                  <h3 className={`${heading.className} text-xl font-bold text-[#103857]`}>{card.title}</h3>
                  <p className="mt-1 text-sm text-[#4b6b7f]">{card.audience}</p>
                </div>

                <ul className="space-y-2 text-sm text-[#2c4f64]">
                  {card.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1 h-2 w-2 rounded-full bg-[#2a6d8f]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild className="w-full bg-[#103857] text-white hover:bg-[#0e2f48]">
                  <Link href={card.ctaHref}>{card.ctaLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="flow" className="relative z-10 mx-auto w-full max-w-6xl px-6 py-10">
        <div className="rounded-3xl border border-[#103857]/10 bg-white/75 p-6 backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#2a6a83]">How It Works</p>
          <h2 className={`${heading.className} mt-2 text-3xl font-extrabold text-[#103857] sm:text-4xl`}>
            Book, attend, track.
          </h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-[#cfe2ea] bg-[#f8fcfd] p-4">
              <span className={`${heading.className} inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#103857] text-sm font-bold text-white`}>
                1
              </span>
              <h3 className={`${heading.className} mt-3 text-lg font-bold text-[#103857]`}>Book</h3>
              <p className="mt-1 text-sm text-[#3f647a]">Owners choose a clinic, vet, date, and reason from clear available slots.</p>
            </div>
            <div className="rounded-2xl border border-[#cfe2ea] bg-[#f8fcfd] p-4">
              <span className={`${heading.className} inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#103857] text-sm font-bold text-white`}>
                2
              </span>
              <h3 className={`${heading.className} mt-3 text-lg font-bold text-[#103857]`}>Attend</h3>
              <p className="mt-1 text-sm text-[#3f647a]">Vets work from an organized dashboard showing upcoming appointments by day and week.</p>
            </div>
            <div className="rounded-2xl border border-[#cfe2ea] bg-[#f8fcfd] p-4">
              <span className={`${heading.className} inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#103857] text-sm font-bold text-white`}>
                3
              </span>
              <h3 className={`${heading.className} mt-3 text-lg font-bold text-[#103857]`}>Track</h3>
              <p className="mt-1 text-sm text-[#3f647a]">Past visits move to history for audits and follow-ups without cluttering daily work.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="final-cta" className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-12 pt-4">
        <div className="rounded-3xl bg-[#103857] p-7 text-white sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#a8d9e0]">Ready to Launch</p>
          <h2 className={`${heading.className} mt-2 text-3xl font-extrabold sm:text-4xl`}>
            Start with owners today and scale to your full clinic team.
          </h2>
          <p className="mt-3 max-w-2xl text-[#d4e7ec]">
            Existing owners, vets, and clinic admins all use the same login page.
            New clinics can request onboarding by email.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-white text-[#103857] hover:bg-[#ecf4f6]">
              <Link href="/signup">Get Started as Owner</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <Link href="/login">Log In</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/40 bg-transparent text-white hover:bg-white/10"
            >
              <a href={`mailto:${ONBOARDING_EMAIL}?subject=VetLink%20Clinic%20Onboarding`}>
                New Clinic Onboarding
              </a>
            </Button>
          </div>
          <p className="mt-4 text-sm text-[#d4e7ec]">
            Contact us:{" "}
            <a className="font-semibold underline underline-offset-2" href={`mailto:${ONBOARDING_EMAIL}`}>
              {ONBOARDING_EMAIL}
            </a>
          </p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-[#103857]/10 bg-white/55">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-[#45657a] sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={scrollToTop}
            aria-label="Back to top"
            className="self-start rounded-xl transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#103857]/50 active:scale-[0.98]"
          >
            <BrandWordmark size="sm" />
          </button>
          <p>VetLink. Better care coordination from booking to records.</p>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes riseIn {
          0% {
            opacity: 0;
            transform: translateY(14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </main>
  );
}
