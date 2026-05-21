'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowRight, BarChart3, Brain, Shield, Zap, TrendingUp, 
  Users, Check, Github, Linkedin, Mail, Menu, X 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { motion, AnimatePresence } from 'motion/react';

export default function LandingPage() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Benefits', href: '#benefits' },
    { label: 'Testimonials', href: '#testimonials' },
  ];

  const features = [
    { icon: BarChart3, title: 'Interactive Dashboards', description: 'Real-time visualizations with dynamic charts and comprehensive KPI tracking.' },
    { icon: Brain, title: 'AI-Driven Insights', description: 'Predictive analytics and pattern recognition powered by advanced AI algorithms.' },
    { icon: Zap, title: 'Voice Control', description: 'Control your analytics with natural voice commands for hands-free operation.' },
    { icon: Shield, title: 'Secure & Compliant', description: 'Enterprise-grade security with role-based access and comprehensive audit trails.' },
    { icon: TrendingUp, title: 'Trend Analysis', description: 'Identify patterns and forecast future performance with intelligent trend detection.' },
    { icon: Users, title: 'Collaborative', description: 'Share insights and reports across your organization with built-in collaboration tools.' },
  ];

  const testimonials = [
    {
      name: 'Sarah Mukeshimana', role: 'CEO, TechVentures Rwanda',
      content: 'AIBID has transformed how we analyze our business data. The AI-driven insights have helped us identify trends we never noticed before, leading to a 30% increase in operational efficiency.',
      rating: 5,
    },
    {
      name: 'David Nkurunziza', role: 'Data Analyst, FinanceHub',
      content: 'The voice control feature is a game-changer. I can now query complex datasets while on the move. The real-time analytics and interactive dashboards save us hours every week.',
      rating: 5,
    },
    {
      name: 'Grace Uwase', role: 'Operations Manager, RetailMax',
      content: 'Implementing AIBID was seamless. The predictive analytics help us forecast inventory needs accurately, and the automated reporting feature has reduced our manual work by 60%.',
      rating: 5,
    },
  ];

  const benefits = [
    'Improved data visibility across your organization',
    'Better understanding of performance trends',
    'Faster, data-driven decision-making',
    'Efficient analytical reporting and automation',
    'Strong application of AI in analytics',
    'Real-time monitoring and alerts',
    'Customizable dashboards and reports',
    'Secure data management and compliance',
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* Navigation */}
      <nav className="border-b border-border sticky top-0 bg-background/95 backdrop-blur-sm z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-serif text-xl font-bold tracking-wide text-foreground">AIBID</span>
            </div>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => document.getElementById(link.href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' })}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden md:flex items-center gap-3">
                <Button variant="ghost" onClick={() => router.push('/login')}>Sign In</Button>
                <Button onClick={() => router.push('/register')}>
                  Get Started <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="md:hidden flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border bg-background overflow-hidden"
            >
              <div className="flex flex-col p-6 gap-4">
                {navLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => {
                      setMobileMenuOpen(false);
                      document.getElementById(link.href.replace('#', ''))?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-left text-lg font-medium text-foreground py-2 border-b border-border/50"
                  >
                    {link.label}
                  </button>
                ))}
                <div className="flex flex-col gap-3 mt-4">
                  <Button variant="outline" className="w-full justify-center" onClick={() => router.push('/login')}>
                    Sign In
                  </Button>
                  <Button
                    className="w-full justify-center bg-neutral-800 dark:bg-neutral-200 dark:text-neutral-900"
                    onClick={() => router.push('/register')}
                  >
                    Get Started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              AI-Powered Interactive<br />Business Intelligence
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed">
              Transform organizational data into meaningful, real-time insights through interactive
              visualizations and artificial intelligence techniques. Make smarter decisions faster.
            </p>
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="w-full md:w-auto bg-neutral-800 hover:bg-neutral-900 dark:bg-neutral-200 dark:text-neutral-900 dark:hover:bg-white"
                onClick={() => router.push('/register')}
              >
                Start Free Trial <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button size="lg" variant="outline" className="w-full md:w-auto" onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
                Learn More
              </Button>
            </div>
          </motion.div>
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-900 dark:to-background" />
      </section>

      {/* Stats */}
      <section className="border-y border-border bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: 'Data Points Processed', value: '2.4M+' },
              { label: 'AI Insights Generated', value: '15K+' },
              { label: 'Active Organizations', value: '240+' },
              { label: 'Reports Created', value: '3.8K+' },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-foreground mb-2">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Comprehensive Analytics Platform</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to make data-driven decisions and stay ahead of the competition
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow bg-card text-card-foreground border border-border">
                    <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-neutral-800 dark:text-neutral-200" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section id="benefits" className="py-20 bg-neutral-50 dark:bg-neutral-900/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <h2 className="text-4xl font-bold text-foreground mb-6">Expected Outcomes & Benefits</h2>
              <p className="text-lg text-muted-foreground mb-8">
                Our platform delivers measurable results that transform how organizations understand and utilize their data.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-start gap-3"
                  >
                    <div className="w-6 h-6 bg-neutral-800 dark:bg-neutral-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-foreground">{benefit}</p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-card rounded-2xl p-8 shadow-xl border border-border"
            >
              <h3 className="text-2xl font-bold text-foreground mb-6">System Modules</h3>
              <div className="space-y-4">
                {[
                  { name: 'Data Collection', desc: 'Structured organizational data capture' },
                  { name: 'Data Processing', desc: 'Clean and transform data' },
                  { name: 'Visualization Dashboard', desc: 'Interactive charts and indicators' },
                  { name: 'AI Analytics', desc: 'Trends and predictive insights' },
                  { name: 'Reporting', desc: 'Analytical summaries' },
                  { name: 'User Management', desc: 'Role-based access control' },
                  { name: 'Security', desc: 'Data protection' },
                  { name: 'Audit & Logging', desc: 'Activity tracking' },
                ].map((module, index) => (
                  <div key={index} className="flex items-start gap-3 pb-4 border-b border-border last:border-0">
                    <div className="w-2 h-2 bg-neutral-800 dark:bg-neutral-400 rounded-full mt-2" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{module.name}</p>
                      <p className="text-sm text-muted-foreground">{module.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 md:py-28">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">What Our Users Say</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hear from organizations that have transformed their data analytics with AIBID
            </p>
          </motion.div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.1 }}>
                <Card className="p-6 h-full hover:shadow-lg transition-shadow bg-card text-card-foreground border border-border">
                  <div className="flex mb-3">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <svg key={i} className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4 italic">&ldquo;{testimonial.content}&rdquo;</p>
                  <div className="border-t border-border pt-4">
                    <h3 className="font-semibold text-foreground">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-neutral-900 dark:bg-neutral-950">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-4xl font-bold text-white mb-6">Ready to Transform Your Data?</h2>
            <p className="text-xl text-neutral-300 mb-10 max-w-2xl mx-auto">
              Join organizations that are already making smarter decisions with AI-powered analytics
            </p>
            <Button size="lg" className="bg-white text-neutral-900 hover:bg-neutral-100" onClick={() => router.push('/register')}>
              Get Started Today <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-background">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-neutral-800 dark:bg-neutral-700 rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">AI</span>
                </div>
                <div>
                  <h3 className="font-bold text-foreground">AIBID</h3>
                  <p className="text-xs text-muted-foreground">Analytics Platform</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-Powered Interactive Business Intelligence Dashboard for data-driven decision making.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button onClick={() => router.push('/login')} className="hover:text-foreground transition-colors">Dashboard</button></li>
                <li><button className="hover:text-foreground transition-colors">Features</button></li>
                <li><button className="hover:text-foreground transition-colors">Pricing</button></li>
                <li><button className="hover:text-foreground transition-colors">Documentation</button></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><button className="hover:text-foreground transition-colors">About</button></li>
                <li><button className="hover:text-foreground transition-colors">Contact</button></li>
                <li><button className="hover:text-foreground transition-colors">Privacy Policy</button></li>
                <li><button className="hover:text-foreground transition-colors">Terms of Service</button></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">© 2026 Bouletteproof Rwanda Limited. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Github className="w-5 h-5" /></button>
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Linkedin className="w-5 h-5" /></button>
              <button className="text-muted-foreground hover:text-foreground transition-colors"><Mail className="w-5 h-5" /></button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
