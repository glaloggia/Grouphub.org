"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, Lock, Compass, UserPlus, LogIn, CalendarDays, MapPin, MessageSquare, BarChart3, MessageSquareText, Globe } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import type { Group, Event as StoredEvent } from '@/types';
import { S_getRandomFutureEvent } from '@/actions/event-actions';
import { S_getMostPopularPublicGroup } from '@/actions/group-actions';
import { S_getLatestForumActivity, type LatestForumActivity } from '@/actions/forum-actions';
import { getPublicStats, type PublicStats as ServerPublicStats } from '@/actions/stats-actions';
import { Logo } from '@/components/shared/Logo';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Footer } from '@/components/layout/Footer';
import { format } from 'date-fns';
import { TimeAgo } from '@/components/shared/TimeAgo';

interface PublicStats extends ServerPublicStats {}

const DEFAULT_EVENT_IMAGE = "https://placehold.co/600x400.png";

const translations = {
  en: {
    pageTitle: "Welcome to GroupHub",
    pageDescription: "Discover events, groups, and stories in your community.",
    latestEvent: "Featured Event",
    popularGroup: "Most Popular Group",
    latestForumPosts: "Latest From The Forums",
    viewGroup: "View Group",
    viewEvent: "View Event",
    readThread: "Read Thread",
    public: "Public",
    private: "Private",
    member: "member",
    members: "members",
    at: "at",
    notSpecified: "Not specified",
    noEvents: "No Events Yet",
    noEventsDesc: "Check back soon for new events!",
    noGroups: "No Public Groups Yet",
    noGroupsDesc: "There are no public groups to show right now.",
    noPostsDesc: "The community blog is waiting for its first story!",
    login: "Login",
    signUp: "Sign Up",
    communityStats: "Community Stats",
    totalUsers: "Total Users",
    totalGroups: "Public Groups",
    totalEvents: "Total Events",
    totalMessages: "Public Messages",
    inForum: "in",
    joinConversation: "Join the conversation",
  },
  es: {
    pageTitle: "Bienvenido a GroupHub",
    pageDescription: "Descubre eventos, grupos e historias en tu comunidad.",
    latestEvent: "Evento Destacado",
    popularGroup: "Grupo Más Popular",
    latestForumPosts: "Lo Último de los Foros",
    viewGroup: "Ver Grupo",
    viewEvent: "Ver Evento",
    readThread: "Leer Hilo",
    public: "Público",
    private: "Privado",
    member: "miembro",
    members: "miembros",
    at: "a las",
    notSpecified: "No especificado",
    noEvents: "Aún No Hay Eventos",
    noEventsDesc: "¡Vuelve pronto para ver nuevos eventos!",
    noGroups: "Aún No Hay Grupos Públicos",
    noGroupsDesc: "No hay grupos públicos para mostrar en este momento.",
    noPostsDesc: "¡El blog de la comunidad está esperando su primera historia!",
    login: "Iniciar Sesión",
    signUp: "Regístrate",
    communityStats: "Estadísticas de la Comunidad",
    totalUsers: "Usuarios Totales",
    totalGroups: "Grupos Públicos",
    totalEvents: "Eventos Totales",
    totalMessages: "Mensajes Públicos",
    inForum: "en",
    joinConversation: "Únete a la conversación",
  },
  pt: {
    pageTitle: "Bem-vindo ao GroupHub",
    pageDescription: "Descubra eventos, grupos e histórias na sua comunidade.",
    latestEvent: "Evento em Destaque",
    popularGroup: "Grupo Mais Popular",
    latestForumPosts: "Últimas dos Fóruns",
    viewGroup: "Ver Grupo",
    viewEvent: "Ver Evento",
    readThread: "Ler Tópico",
    public: "Público",
    private: "Privado",
    member: "membro",
    members: "membros",
    at: "às",
    notSpecified: "Não especificado",
    noEvents: "Nenhum Evento Ainda",
    noEventsDesc: "Volte em breve para novos eventos!",
    noGroups: "Nenhum Grupo Público Ainda",
    noGroupsDesc: "Não há grupos públicos para mostrar no momento.",
    noPostsDesc: "O blog da comunidade está aguardando sua primeira história!",
    login: "Entrar",
    signUp: "Cadastre-se",
    communityStats: "Estatísticas da Comunidade",
    totalUsers: "Total de Usuários",
    totalGroups: "Grupos Públicos",
    totalEvents: "Total de Eventos",
    totalMessages: "Mensagens Públicas",
    inForum: "em",
    joinConversation: "Junte-se à conversa",
  },
  fr: {
    pageTitle: "Bienvenue sur GroupHub",
    pageDescription: "Découvrez des événements, des groupes et des histoires dans votre communauté.",
    latestEvent: "Événement à la Une",
    popularGroup: "Groupe le Plus Populaire",
    latestForumPosts: "Dernières Nouvelles des Forums",
    viewGroup: "Voir le Groupe",
    viewEvent: "Voir l'Événement",
    readThread: "Lire le Fil",
    public: "Public",
    private: "Privé",
    member: "membre",
    members: "membres",
    at: "à",
    notSpecified: "Non spécifié",
    noEvents: "Aucun Événement Pour le Moment",
    noEventsDesc: "Revenez bientôt pour de nouveaux événements !",
    noGroups: "Aucun Groupe Public Pour le Moment",
    noGroupsDesc: "Il n'y a aucun groupe public à afficher pour le moment.",
    noPostsDesc: "Le blog de la communauté attend sa première histoire !",
    login: "Connexion",
    signUp: "S'inscrire",
    communityStats: "Statistiques de la Communauté",
    totalUsers: "Utilisateurs Totaux",
    totalGroups: "Groupes Publics",
    totalEvents: "Événements Totaux",
    totalMessages: "Messages Publics",
    inForum: "dans",
    joinConversation: "Rejoignez la conversation",
  },
  de: {
    pageTitle: "Willkommen bei GroupHub",
    pageDescription: "Entdecken Sie Events, Gruppen und Geschichten in Ihrer Community.",
    latestEvent: "Vorgestelltes Event",
    popularGroup: "Beliebteste Gruppe",
    latestForumPosts: "Neuestes aus den Foren",
    viewGroup: "Gruppe ansehen",
    viewEvent: "Event ansehen",
    readThread: "Thread lesen",
    public: "Öffentlich",
    private: "Privat",
    member: "Mitglied",
    members: "Mitglieder",
    at: "um",
    notSpecified: "Nicht angegeben",
    noEvents: "Noch keine Events",
    noEventsDesc: "Schauen Sie bald wieder für neue Events vorbei!",
    noGroups: "Noch keine öffentlichen Gruppen",
    noGroupsDesc: "Derzeit gibt es keine öffentlichen Gruppen zum Anzeigen.",
    noPostsDesc: "Der Community-Blog wartet auf seine erste Geschichte!",
    login: "Anmelden",
    signUp: "Registrieren",
    communityStats: "Community-Statistiken",
    totalUsers: "Benutzer insgesamt",
    totalGroups: "Öffentliche Gruppen",
    totalEvents: "Events insgesamt",
    totalMessages: "Öffentliche Nachrichten",
    inForum: "in",
    joinConversation: "Nimm an der Unterhaltung teil",
  },
  it: {
    pageTitle: "Benvenuto su GroupHub",
    pageDescription: "Scopri eventi, gruppi e storie nella tua comunità.",
    latestEvent: "Evento in Evidenza",
    popularGroup: "Gruppo Più Popolare",
    latestForumPosts: "Le Ultime dai Forum",
    viewGroup: "Vedi Gruppo",
    viewEvent: "Vedi Evento",
    readThread: "Leggi Discussione",
    public: "Pubblico",
    private: "Privato",
    member: "membro",
    members: "membri",
    at: "alle",
    notSpecified: "Non specificato",
    noEvents: "Nessun Evento Ancora",
    noEventsDesc: "Torna presto per nuovi eventi!",
    noGroups: "Nessun Gruppo Pubblico Ancora",
    noGroupsDesc: "Al momento non ci sono gruppi pubblici da mostrare.",
    noPostsDesc: "Il blog della community attende la sua prima storia!",
    login: "Accedi",
    signUp: "Registrati",
    communityStats: "Statistiche della Community",
    totalUsers: "Utenti Totali",
    totalGroups: "Gruppi Pubblici",
    totalEvents: "Eventi Totali",
    totalMessages: "Messaggi Pubblici",
    inForum: "in",
    joinConversation: "Partecipa alla conversazione",
  },
  ru: {
    pageTitle: "Добро пожаловать в GroupHub",
    pageDescription: "Откройте для себя события, группы и истории в вашем сообществе.",
    latestEvent: "Рекомендуемое событие",
    popularGroup: "Самая популярная группа",
    latestForumPosts: "Последнее с форумов",
    viewGroup: "Просмотр группы",
    viewEvent: "Просмотр события",
    readThread: "Читать тему",
    public: "Публичная",
    private: "Частная",
    member: "участник",
    members: "участников",
    at: "в",
    notSpecified: "Не указано",
    noEvents: "Пока нет событий",
    noEventsDesc: "Заходите позже за новыми событиями!",
    noGroups: "Пока нет публичных групп",
    noGroupsDesc: "Сейчас нет публичных групп для отображения.",
    noPostsDesc: "Блог сообщества ждет своей первой истории!",
    login: "Войти",
    signUp: "Зарегистрироваться",
    communityStats: "Статистика сообщества",
    totalUsers: "Всего пользователей",
    totalGroups: "Публичные группы",
    totalEvents: "Всего событий",
    totalMessages: "Публичные сообщения",
    inForum: "в",
    joinConversation: "Присоединяйтесь к разговору",
  }
};

function EventCard({ event, t }: { event: StoredEvent, t: typeof translations['en'] }) {
    const imageUrl = event.image || DEFAULT_EVENT_IMAGE;
    return (
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden h-full">
            <CardHeader className="p-4 flex-row gap-3 items-center">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={imageUrl} alt={event.name}/>
                    <AvatarFallback>{event.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="font-headline text-lg mb-1 line-clamp-2">{event.name}</CardTitle>
                </div>
            </CardHeader>
            <div className="p-4 pt-0 flex flex-col flex-grow">
                <div className="flex items-center text-xs text-muted-foreground mb-1">
                    <CalendarDays className="h-3 w-3 mr-1.5 shrink-0" />
                    <span>{format(new Date(event.date + 'T00:00:00Z'), 'MMMM d')} {event.time ? `${t.at} ${event.time}` : ''}</span>
                </div>
                <div className="flex items-center text-xs text-muted-foreground mb-2">
                    <MapPin className="h-3 w-3 mr-1.5 shrink-0" /> 
                    <span>{event.location || t.notSpecified}</span>
                </div>
                 <CardDescription className="text-sm mb-3 flex-grow line-clamp-2">{event.description}</CardDescription>
                 <CardFooter className="p-0 mt-auto">
                    <Button asChild className="w-full" size="sm">
                        <Link href={`/events/${event.id}`}>{t.viewEvent}</Link>
                    </Button>
                </CardFooter>
            </div>
        </Card>
    )
}

function GroupCard({ group, t }: { group: Group, t: typeof translations['en'] }) {
    return (
        <Card className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden h-full">
            <CardHeader className="p-4 flex-row gap-3 items-center">
                <Avatar className="h-10 w-10 border">
                    <AvatarImage src={group.image} alt={group.name}/>
                    <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                    <CardTitle className="font-headline text-lg mb-1 line-clamp-2">{group.name}</CardTitle>
                    <div className="flex items-center text-xs text-muted-foreground">
                        {group.isPublic ? <Eye className="h-3 w-3 mr-1" /> : <Lock className="h-3 w-3 mr-1" />}
                        <span>{group.isPublic ? t.public : t.private}</span>
                        <span className="mx-1.5">&bull;</span>
                        <span>{group.memberIds?.length || 0} {(group.memberIds?.length || 0) === 1 ? t.member : t.members}</span>
                    </div>
                </div>
            </CardHeader>
            <div className="p-4 pt-0 flex flex-col flex-grow">
                <CardDescription className="text-sm mb-3 flex-grow line-clamp-2">{group.description}</CardDescription>
                <CardFooter className="p-0 mt-auto">
                    <Button asChild className="w-full" size="sm">
                        <Link href={`/groups/${group.id}`}>{t.viewGroup}</Link>
                    </Button>
                </CardFooter>
            </div>
        </Card>
    );
}

function StatsCard({ stats, t }: { stats: PublicStats, t: typeof translations['en'] }) {
    return (
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden h-full">
             <CardHeader>
                <CardTitle className="font-headline text-xl line-clamp-2">{t.communityStats}</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-center">
                 <div className="bg-muted p-3 rounded-md">
                    <Users className="h-6 w-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats.users}</p>
                    <p className="text-xs text-muted-foreground">{t.totalUsers}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                    <Compass className="h-6 w-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats.groups}</p>
                    <p className="text-xs text-muted-foreground">{t.totalGroups}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                    <CalendarDays className="h-6 w-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats.events}</p>
                    <p className="text-xs text-muted-foreground">{t.totalEvents}</p>
                </div>
                <div className="bg-muted p-3 rounded-md">
                    <MessageSquare className="h-6 w-6 text-primary mx-auto mb-1" />
                    <p className="text-2xl font-bold">{stats.messages}</p>
                    <p className="text-xs text-muted-foreground">{t.totalMessages}</p>
                </div>
            </CardContent>
        </Card>
    )
}

function LoadingSkeletons({ type }: { type: 'stats' | 'card' }) {
    if (type === 'stats') {
      return (
        <Card className="shadow-lg">
            <CardHeader>
                <Skeleton className="h-7 w-48" />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-center">
                {[1,2,3,4].map(i => (
                    <div key={`stat-skel-item-${i}`} className="bg-muted p-3 rounded-md">
                        <Skeleton className="h-6 w-6 mx-auto mb-1 rounded-full" />
                        <Skeleton className="h-7 w-12 mx-auto mb-1" />
                        <Skeleton className="h-3 w-16 mx-auto" />
                    </div>
                ))}
            </CardContent>
        </Card>
      );
    }
    // card skeleton
    return (
        <Card className="flex flex-col shadow-lg h-full">
            <div className="p-6 flex-grow space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="space-y-2 pt-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="pt-4">
                  <Skeleton className="h-10 w-full" />
                </div>
            </div>
        </Card>
    );
}

export default function HomePage() {
  const [latestEvent, setLatestEvent] = useState<StoredEvent | null>(null);
  const [popularGroup, setPopularGroup] = useState<Group | null>(null);
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null);
  const [latestForumActivity, setLatestForumActivity] = useState<LatestForumActivity[]>([]);
  const [loading, setLoading] = useState({ event: true, group: true, stats: true, forumActivity: true });
  
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');
  const isMobile = useIsMobile();

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'it', name: 'Italiano', flag: '🇮🇹' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  ];

  useEffect(() => {
    if (typeof window !== "undefined") {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  const t = translations[lang];

  useEffect(() => {
    if (!authLoading && currentUser) {
      router.replace('/dashboard');
    }
  }, [currentUser, authLoading, router]);

  const fetchPublicData = useCallback(async () => {
    setLoading({ event: true, group: true, stats: true, forumActivity: true });
    
    getPublicStats().then(stats => setPublicStats(stats)).catch(err => console.error("Error fetching stats", err)).finally(() => setLoading(prev => ({...prev, stats: false})));
    S_getRandomFutureEvent().then(event => setLatestEvent(event)).catch(err => console.error("Error fetching event", err)).finally(() => setLoading(prev => ({...prev, event: false})));
    S_getMostPopularPublicGroup().then(group => setPopularGroup(group)).catch(err => console.error("Error fetching group", err)).finally(() => setLoading(prev => ({...prev, group: false})));
    S_getLatestForumActivity(5).then(activity => setLatestForumActivity(activity)).catch(err => console.error("Error fetching forum activity", err)).finally(() => setLoading(prev => ({...prev, forumActivity: false})));

  }, []);

  useEffect(() => {
    if (!authLoading && !currentUser) {
        fetchPublicData();
    }
  }, [authLoading, currentUser, fetchPublicData]);

  if (authLoading || currentUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <Skeleton className="h-12 w-12 rounded-full mb-4" />
        <Skeleton className="h-6 w-48 mb-3" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  const renderContent = () => {
      const cards = [
        { key: 'event', loading: loading.event, data: latestEvent, CardComponent: EventCard, title: t.latestEvent, emptyDesc: t.noEventsDesc, Icon: CalendarDays },
        { key: 'group', loading: loading.group, data: popularGroup, CardComponent: GroupCard, title: t.popularGroup, emptyDesc: t.noGroupsDesc, Icon: Compass },
        { key: 'stats', loading: loading.stats, data: publicStats, CardComponent: StatsCard, title: t.communityStats, emptyDesc: "", Icon: BarChart3 },
    ];

      if (isMobile) {
          return (
             <Carousel className="w-full max-w-xs mx-auto" opts={{ loop: true }}>
                <CarouselContent>
                    {cards.map(item => (
                        <CarouselItem key={item.key} className="p-1">
                             <div className="space-y-4">
                                <h3 className="font-headline text-2xl font-bold tracking-tight text-center">{item.title}</h3>
                                {item.loading ? (
                                    <LoadingSkeletons type={item.key === 'stats' ? 'stats' : 'card'} />
                                ) : item.data ? (
                                    <item.CardComponent {...{ [item.key]: item.data, t: t } as any} />
                                ) : (
                                    <div className="text-center py-10 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center">
                                        <item.Icon className="mx-auto h-12 w-12 text-muted-foreground" />
                                        <p className="mt-1 text-sm text-muted-foreground">{item.emptyDesc}</p>
                                    </div>
                                )}
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
                <CarouselPrevious className="-left-4" />
                <CarouselNext className="-right-4" />
            </Carousel>
          )
      }

      return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Desktop Grid Layout */}
              <div className="space-y-4">
                <h3 className="font-headline text-2xl font-bold tracking-tight">{t.latestEvent}</h3>
                {loading.event ? <LoadingSkeletons type="card" /> : latestEvent ? <EventCard event={latestEvent} t={t} /> : <div className="text-center py-10 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center"><CalendarDays className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-1 text-sm text-muted-foreground">{t.noEventsDesc}</p></div>}
              </div>
              <div className="space-y-4">
                <h3 className="font-headline text-2xl font-bold tracking-tight">{t.popularGroup}</h3>
                {loading.group ? <LoadingSkeletons type="card" /> : popularGroup ? <GroupCard group={popularGroup} t={t} /> : <div className="text-center py-10 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center"><Compass className="mx-auto h-12 w-12 text-muted-foreground" /><p className="mt-1 text-sm text-muted-foreground">{t.noGroupsDesc}</p></div>}
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col min-h-screen bg-transparent">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <Logo />
            <nav className="ml-auto flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Globe className="h-5 w-5" />
                    <span className="sr-only">Change language</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {languages.map((language) => (
                    <DropdownMenuItem key={language.code} onClick={() => setLang(language.code as any)} className="cursor-pointer">
                      <span className="mr-2 text-lg">{language.flag}</span>
                      <span>{language.name}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" asChild>
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4 md:hidden" />
                  <span className="hidden md:inline">{t.login}</span>
                </Link>
              </Button>
              <Button variant="default" asChild>
                <Link href="/signup">
                  <UserPlus className="mr-2 h-4 w-4 md:hidden" />
                  <span className="hidden md:inline">{t.signUp}</span>
                </Link>
              </Button>
            </nav>
        </div>
      </header>

      <main className="flex-1">
        <PageShell
          title={t.pageTitle}
          description={t.pageDescription}
        >
          <div className="space-y-12">
             <section className="mt-8 md:mt-0">
               {renderContent()}
             </section>
             
             <section>
                <h3 className="font-headline text-2xl font-bold tracking-tight text-center md:text-left mb-4">{t.latestForumPosts}</h3>
                {loading.forumActivity ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                    </div>
                ) : latestForumActivity.length > 0 ? (
                    <div className="space-y-4">
                        {latestForumActivity.map(activity => (
                            <Card key={activity.forumId} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-4 flex items-center gap-4">
                                    <MessageSquareText className="h-8 w-8 text-primary shrink-0" />
                                    <div className="flex-1">
                                        <Link href={`/forums/${activity.forumId}/${activity.threadId}`} className="font-semibold hover:underline">
                                            {activity.threadTitle}
                                        </Link>
                                        <p className="text-sm text-muted-foreground">
                                            {t.inForum} <Link href={`/forums/${activity.forumId}`} className="font-medium text-primary/80 hover:underline">{activity.forumName}</Link> &bull; <TimeAgo dateString={activity.postedAt} />
                                        </p>
                                    </div>
                                    <Button asChild variant="outline" size="sm" className="ml-auto shrink-0">
                                        <Link href={`/forums/${activity.forumId}/${activity.threadId}`}>{t.readThread}</Link>
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                     <div className="text-center py-10 rounded-lg bg-muted/50 h-full flex flex-col justify-center items-center">
                        <MessageSquareText className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-1 text-sm text-muted-foreground">{t.noPostsDesc}</p>
                    </div>
                )}
             </section>

             <section className="text-center py-8">
                <Button asChild size="lg">
                    <Link href="/signup">{t.joinConversation}</Link>
                </Button>
            </section>

             {!isMobile && (
                 <section>
                    <h3 className="font-headline text-2xl font-bold tracking-tight text-center mb-4">{t.communityStats}</h3>
                    {loading.stats ? <LoadingSkeletons type="stats" /> : publicStats ? <StatsCard stats={publicStats} t={t} /> : <div className="text-center p-4">...</div>}
                </section>
             )}
          </div>
        </PageShell>
      </main>
      <Footer />
    </div>
  );
}
