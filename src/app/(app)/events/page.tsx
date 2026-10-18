

"use client"; 

import { PageShell } from "@/components/shared/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PlusCircle, CalendarDays, Users, MapPin, Users2, Globe, Search as SearchIcon, Compass, Archive, RotateCcw, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import React, { useState, useEffect, useMemo, useCallback } from "react"; 
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Event as StoredEvent, ContactableUser } from "@/types";
import { generateEventOccurrences, isEventInstancePast as isDatePast } from "@/lib/event-utils";
import { addMonths, startOfDay, formatISO, parseISO, format } from "date-fns";
import { getAllMasterEvents } from '@/actions/event-actions'; // Server action for events
import { getAllGroups as S_getAllGroups } from '@/actions/group-actions'; // Server action for groups
import { S_getMultipleContactableUserDetails } from '@/actions/user-profile-actions'; // For attendee details


interface Event extends StoredEvent {}
interface Group {
  id: string;
  name: string;
  description: string;
  memberIds: string[];
  isPublic: boolean;
  image: string;
  creatorId: string;
  adminIds: string[];
}

const DEFAULT_EVENT_IMAGE = "https://placehold.co/600x400.png";
const isDynamicImage = (url: string) => url.startsWith('data:image') || !url.startsWith('https://placehold.co');
const getDefaultVercelAvatar = (identifier: string | null | undefined) => `https://avatar.vercel.sh/${identifier || 'default'}.png`;

const translations = {
  en: {
    pageTitle: "Events",
    pageDescription: "Discover upcoming events or browse past activities.",
    searchPlaceholder: "Search events...",
    createEventButton: "Create Event",
    loadingEvents: "Loading your events...",
    upcomingTab: "Upcoming Events",
    myGroupsTab: "My Group Events",
    emptyUpcomingSearchTitle: "No Upcoming Events Found",
    emptyUpcomingSearchDesc: (term: string) => `Your search for "${term}" did not match any upcoming events.`,
    emptyUpcomingTitle: "No Upcoming Events",
    emptyUpcomingDesc: "There are no events scheduled. Why not create one?",
    emptyUpcomingCta: "Create Your First Event",
    emptyMyGroupsLoginTitle: "Login to See Your Group Events",
    emptyMyGroupsLoginDesc: "Please log in to view upcoming events from the groups you are a member of.",
    emptyMyGroupsSearchTitle: "No Events Found",
    myGroupsSearchNotFoundDesc: (term: string) => `Your search for "${term}" did not match any upcoming events in your groups.`,
    emptyMyGroupsTitle: "No Upcoming Events in Your Groups",
    emptyMyGroupsDesc: "There are no upcoming events scheduled in the groups you're part of.",
    emptyMyGroupsCta: "Create an Event",
    attendee: "attendee",
    attendees: "attendees",
    recurring: "Recurring",
    cancelled: "CANCELLED",
    viewDetails: "View Details",
    attendeesFor: (name: string) => `Attendees for ${name}`,
    attendeesDesc: "List of users RSVP'd to this event.",
    loadingAttendees: "Loading attendees...",
    noRsvps: "No one has RSVP'd yet.",
    you: "(You)",
    user: (id: string) => `User ${id.substring(0, 6)}...`,
    close: "Close",
  },
  es: {
    pageTitle: "Eventos",
    pageDescription: "Descubre próximos eventos o explora actividades pasadas.",
    searchPlaceholder: "Buscar eventos...",
    createEventButton: "Crear Evento",
    loadingEvents: "Cargando tus eventos...",
    upcomingTab: "Próximos Eventos",
    myGroupsTab: "Eventos de Mis Grupos",
    emptyUpcomingSearchTitle: "No se Encontraron Próximos Eventos",
    emptyUpcomingSearchDesc: (term: string) => `Tu búsqueda de "${term}" no coincidió con ningún evento próximo.`,
    emptyUpcomingTitle: "No Hay Próximos Eventos",
    emptyUpcomingDesc: "No hay eventos programados. ¿Por qué no crear uno?",
    emptyUpcomingCta: "Crea Tu Primer Evento",
    emptyMyGroupsLoginTitle: "Inicia Sesión para Ver los Eventos de tu Grupo",
    emptyMyGroupsLoginDesc: "Por favor, inicia sesión para ver los próximos eventos de los grupos de los que eres miembro.",
    emptyMyGroupsSearchTitle: "No se Encontraron Eventos",
    myGroupsSearchNotFoundDesc: (term: string) => `Tu búsqueda de "${term}" no coincidió con ningún evento próximo en tus grupos.`,
    emptyMyGroupsTitle: "No Hay Próximos Eventos en Tus Grupos",
    emptyMyGroupsDesc: "No hay eventos próximos programados en los grupos de los que eres parte.",
    emptyMyGroupsCta: "Crear un Evento",
    attendee: "asistente",
    attendees: "asistentes",
    recurring: "Recurrente",
    cancelled: "CANCELADO",
    viewDetails: "Ver Detalles",
    attendeesFor: (name: string) => `Asistentes para ${name}`,
    attendeesDesc: "Lista de usuarios que han confirmado su asistencia a este evento.",
    loadingAttendees: "Cargando asistentes...",
    noRsvps: "Nadie ha confirmado su asistencia todavía.",
    you: "(Tú)",
    user: (id: string) => `Usuario ${id.substring(0, 6)}...`,
    close: "Cerrar",
  },
  pt: {
    pageTitle: "Eventos",
    pageDescription: "Descubra próximos eventos ou navegue por atividades passadas.",
    searchPlaceholder: "Pesquisar eventos...",
    createEventButton: "Criar Evento",
    loadingEvents: "Carregando seus eventos...",
    upcomingTab: "Próximos Eventos",
    myGroupsTab: "Eventos dos Meus Grupos",
    emptyUpcomingSearchTitle: "Nenhum Próximo Evento Encontrado",
    emptyUpcomingSearchDesc: (term: string) => `Sua busca por "${term}" não correspondeu a nenhum próximo evento.`,
    emptyUpcomingTitle: "Nenhum Próximo Evento",
    emptyUpcomingDesc: "Não há eventos agendados. Que tal criar um?",
    emptyUpcomingCta: "Crie Seu Primeiro Evento",
    emptyMyGroupsLoginTitle: "Faça Login para Ver os Eventos do seu Grupo",
    emptyMyGroupsLoginDesc: "Por favor, faça login para ver os próximos eventos dos grupos dos quais você é membro.",
    emptyMyGroupsSearchTitle: "Nenhum Evento Encontrado",
    myGroupsSearchNotFoundDesc: (term: string) => `Sua busca por "${term}" não correspondeu a nenhum próximo evento em seus grupos.`,
    emptyMyGroupsTitle: "Nenhum Próximo Evento em Seus Grupos",
    emptyMyGroupsDesc: "Não há eventos próximos agendados nos grupos dos quais você faz parte.",
    emptyMyGroupsCta: "Criar um Evento",
    attendee: "participante",
    attendees: "participantes",
    recurring: "Recorrente",
    cancelled: "CANCELADO",
    viewDetails: "Ver Detalhes",
    attendeesFor: (name: string) => `Participantes de ${name}`,
    attendeesDesc: "Lista de usuários que confirmaram presença neste evento.",
    loadingAttendees: "Carregando participantes...",
    noRsvps: "Ninguém confirmou presença ainda.",
    you: "(Você)",
    user: (id: string) => `Usuário ${id.substring(0, 6)}...`,
    close: "Fechar",
  },
  fr: {
    pageTitle: "Événements",
    pageDescription: "Découvrez les événements à venir ou parcourez les activités passées.",
    searchPlaceholder: "Rechercher des événements...",
    createEventButton: "Créer un Événement",
    loadingEvents: "Chargement de vos événements...",
    upcomingTab: "Événements à Venir",
    myGroupsTab: "Événements de Mes Groupes",
    emptyUpcomingSearchTitle: "Aucun Événement à Venir Trouvé",
    emptyUpcomingSearchDesc: (term: string) => `Votre recherche pour "${term}" n'a correspondu à aucun événement à venir.`,
    emptyUpcomingTitle: "Aucun Événement à Venir",
    emptyUpcomingDesc: "Aucun événement n'est programmé. Pourquoi ne pas en créer un ?",
    emptyUpcomingCta: "Créez Votre Premier Événement",
    emptyMyGroupsLoginTitle: "Connectez-vous pour Voir les Événements de votre Groupe",
    emptyMyGroupsLoginDesc: "Veuillez vous connecter pour voir les événements à venir des groupes dont vous êtes membre.",
    emptyMyGroupsSearchTitle: "Aucun Événement Trouvé",
    myGroupsSearchNotFoundDesc: (term: string) => `Votre recherche pour "${term}" n'a correspondu à aucun événement à venir dans vos groupes.`,
    emptyMyGroupsTitle: "Aucun Événement à Venir dans Vos Groupes",
    emptyMyGroupsDesc: "Aucun événement à venir n'est programmé dans les groupes dont vous faites partie.",
    emptyMyGroupsCta: "Créer un Événement",
    attendee: "participant",
    attendees: "participants",
    recurring: "Récurrent",
    cancelled: "ANNULÉ",
    viewDetails: "Voir les Détails",
    attendeesFor: (name: string) => `Participants pour ${name}`,
    attendeesDesc: "Liste des utilisateurs ayant confirmé leur présence à cet événement.",
    loadingAttendees: "Chargement des participants...",
    noRsvps: "Personne n'a encore confirmé sa présence.",
    you: "(Vous)",
    user: (id: string) => `Utilisateur ${id.substring(0, 6)}...`,
    close: "Fermer",
  },
  de: {
    pageTitle: "Events",
    pageDescription: "Entdecken Sie bevorstehende Events oder durchsuchen Sie vergangene Aktivitäten.",
    searchPlaceholder: "Events suchen...",
    createEventButton: "Event erstellen",
    loadingEvents: "Lade deine Events...",
    upcomingTab: "Bevorstehende Events",
    myGroupsTab: "Meine Gruppen-Events",
    emptyUpcomingSearchTitle: "Keine bevorstehenden Events gefunden",
    emptyUpcomingSearchDesc: (term: string) => `Ihre Suche nach "${term}" ergab keine Treffer bei bevorstehenden Events.`,
    emptyUpcomingTitle: "Keine bevorstehenden Events",
    emptyUpcomingDesc: "Es sind keine Events geplant. Warum nicht eines erstellen?",
    emptyUpcomingCta: "Erstellen Sie Ihr erstes Event",
    emptyMyGroupsLoginTitle: "Einloggen, um Ihre Gruppen-Events zu sehen",
    emptyMyGroupsLoginDesc: "Bitte loggen Sie sich ein, um bevorstehende Events aus den Gruppen anzuzeigen, in denen Sie Mitglied sind.",
    emptyMyGroupsSearchTitle: "Keine Events gefunden",
    myGroupsSearchNotFoundDesc: (term: string) => `Ihre Suche nach "${term}" ergab keine Treffer bei bevorstehenden Events in Ihren Gruppen.`,
    emptyMyGroupsTitle: "Keine bevorstehenden Events in Ihren Gruppen",
    emptyMyGroupsDesc: "In den Gruppen, denen Sie angehören, sind keine bevorstehenden Events geplant.",
    emptyMyGroupsCta: "Ein Event erstellen",
    attendee: "Teilnehmer",
    attendees: "Teilnehmer",
    recurring: "Wiederkehrend",
    cancelled: "ABGESAGT",
    viewDetails: "Details anzeigen",
    attendeesFor: (name: string) => `Teilnehmer für ${name}`,
    attendeesDesc: "Liste der Benutzer, die für dieses Event zugesagt haben.",
    loadingAttendees: "Lade Teilnehmer...",
    noRsvps: "Noch hat niemand zugesagt.",
    you: "(Du)",
    user: (id: string) => `Benutzer ${id.substring(0, 6)}...`,
    close: "Schließen",
  },
  it: {
    pageTitle: "Eventi",
    pageDescription: "Scopri eventi imminenti o sfoglia le attività passate.",
    searchPlaceholder: "Cerca eventi...",
    createEventButton: "Crea Evento",
    loadingEvents: "Caricamento dei tuoi eventi...",
    upcomingTab: "Eventi imminenti",
    myGroupsTab: "Eventi dei Miei Gruppi",
    emptyUpcomingSearchTitle: "Nessun Evento Imminente Trovato",
    emptyUpcomingSearchDesc: (term: string) => `La tua ricerca per "${term}" non ha trovato eventi imminenti.`,
    emptyUpcomingTitle: "Nessun Evento Imminente",
    emptyUpcomingDesc: "Non ci sono eventi in programma. Perché non ne crei uno?",
    emptyUpcomingCta: "Crea il Tuo Primo Evento",
    emptyMyGroupsLoginTitle: "Accedi per Vedere gli Eventi del Tuo Gruppo",
    emptyMyGroupsLoginDesc: "Effettua il login per vedere gli eventi imminenti dei gruppi di cui sei membro.",
    emptyMyGroupsSearchTitle: "Nessun Evento Trovato",
    myGroupsSearchNotFoundDesc: (term: string) => `La tua ricerca per "${term}" non ha trovato eventi imminenti nei tuoi gruppi.`,
    emptyMyGroupsTitle: "Nessun Evento Imminente nei Tuoi Gruppi",
    emptyMyGroupsDesc: "Non ci sono eventi imminenti programmati nei gruppi di cui fai parte.",
    emptyMyGroupsCta: "Crea un Evento",
    attendee: "partecipante",
    attendees: "partecipanti",
    recurring: "Ricorrente",
    cancelled: "ANNULLATO",
    viewDetails: "Vedi Dettagli",
    attendeesFor: (name: string) => `Partecipanti per ${name}`,
    attendeesDesc: "Elenco degli utenti che hanno confermato la loro presenza a questo evento.",
    loadingAttendees: "Caricamento partecipanti...",
    noRsvps: "Nessuno ha ancora confermato la presenza.",
    you: "(Tu)",
    user: (id: string) => `Utente ${id.substring(0, 6)}...`,
    close: "Chiudi",
  },
  ru: {
    pageTitle: "События",
    pageDescription: "Находите предстоящие события или просматривайте прошлые мероприятия.",
    searchPlaceholder: "Поиск событий...",
    createEventButton: "Создать событие",
    loadingEvents: "Загрузка ваших событий...",
    upcomingTab: "Предстоящие",
    myGroupsTab: "События моих групп",
    emptyUpcomingSearchTitle: "Предстоящих событий не найдено",
    emptyUpcomingSearchDesc: (term: string) => `По вашему запросу "${term}" не найдено предстоящих событий.`,
    emptyUpcomingTitle: "Нет предстоящих событий",
    emptyUpcomingDesc: "Нет запланированных событий. Почему бы не создать одно?",
    emptyUpcomingCta: "Создайте свое первое событие",
    emptyMyGroupsLoginTitle: "Войдите, чтобы увидеть события вашей группы",
    emptyMyGroupsLoginDesc: "Пожалуйста, войдите, чтобы просмотреть предстоящие события из групп, в которых вы состоите.",
    emptyMyGroupsSearchTitle: "Событий не найдено",
    myGroupsSearchNotFoundDesc: (term: string) => `По вашему запросу "${term}" не найдено предстоящих событий в ваших группах.`,
    emptyMyGroupsTitle: "Нет предстоящих событий в ваших группах",
    emptyMyGroupsDesc: "В группах, в которых вы состоите, нет запланированных предстоящих событий.",
    emptyMyGroupsCta: "Создать событие",
    attendee: "участник",
    attendees: "участников",
    recurring: "Повторяющееся",
    cancelled: "ОТМЕНЕНО",
    viewDetails: "Посмотреть детали",
    attendeesFor: (name: string) => `Участники "${name}"`,
    attendeesDesc: "Список пользователей, подтвердивших участие в этом событии.",
    loadingAttendees: "Загрузка участников...",
    noRsvps: "Еще никто не подтвердил участие.",
    you: "(Вы)",
    user: (id: string) => `Пользователь ${id.substring(0, 6)}...`,
    close: "Закрыть",
  }
};


export default function EventsPage() {
  const [allLoadedUpcomingEvents, setAllLoadedUpcomingEvents] = useState<Event[]>([]);
  const [myMemberGroupIds, setMyMemberGroupIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<string>("upcoming"); 
  const [searchTerm, setSearchTerm] = useState("");

  const [attendeeDetailsCache, setAttendeeDetailsCache] = useState<Record<string, Record<string, Pick<ContactableUser, 'name' | 'avatar' | 'email'> | null>>>({});
  const [currentDialogEventAttendees, setCurrentDialogEventAttendees] = useState<string[]>([]);
  const [isLoadingDialogAttendees, setIsLoadingDialogAttendees] = useState(false);
  const [currentDialogEventId, setCurrentDialogEventId] = useState<string | null>(null);

  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);
  
  const t = translations[lang];

  useEffect(() => {
    document.title = `${t.pageTitle} | GroupHub`;
  }, [t]);


  const fetchPageData = useCallback(async () => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    let displayableEvents: Event[] = [];

    try {
      const allRawMasterEvents = await getAllMasterEvents();
      const today = startOfDay(new Date());
      const rangeStart = today;
      const rangeEnd = addMonths(today, 12); // Consider a 12-month window for upcoming events

      allRawMasterEvents.forEach(masterEvent => {
        const mappedMasterEvent: Event = {
            ...masterEvent,
            id: masterEvent.id || `event-${Date.now()}`,
            name: masterEvent.name || "Unnamed Event",
            date: typeof masterEvent.date === 'string' ? masterEvent.date : (masterEvent.date ? new Date(masterEvent.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            time: typeof masterEvent.time === 'string' ? masterEvent.time : (masterEvent.time || undefined),
            location: masterEvent.location || "Not specified",
            groupId: masterEvent.groupId || "unknown_group",
            group: masterEvent.group || "Unknown Group", 
            description: masterEvent.description || "No description provided.",
            image: typeof masterEvent.image === 'string' && masterEvent.image.trim() !== '' ? masterEvent.image : DEFAULT_EVENT_IMAGE,
            attendees: Array.isArray(masterEvent.attendees) ? masterEvent.attendees : [],
            isRecurring: typeof masterEvent.isRecurring === 'boolean' ? masterEvent.isRecurring : false,
            recurrence: masterEvent.recurrence || undefined,
            isCancelled: typeof masterEvent.isCancelled === 'boolean' ? masterEvent.isCancelled : false,
            instanceAttendees: masterEvent.instanceAttendees || {},
            instanceMetadata: masterEvent.instanceMetadata || {},
        };

        if (mappedMasterEvent.isCancelled && !mappedMasterEvent.isInstance) { 
            return;
        }
        if (mappedMasterEvent.isRecurring && mappedMasterEvent.recurrence && !mappedMasterEvent.isInstance) {
          const instances = generateEventOccurrences(mappedMasterEvent, rangeStart, rangeEnd);
          instances.forEach(instance => {
            // isCancelled check is within generateEventOccurrences for instances
            if (!isDatePast(instance.date) && !instance.isCancelled) { 
              displayableEvents.push(instance);
            }
          });
        } else if (!mappedMasterEvent.isInstance) { 
          if (!isDatePast(mappedMasterEvent.date) && !mappedMasterEvent.isCancelled) {
            displayableEvents.push(mappedMasterEvent);
          }
        }
      });

      displayableEvents.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      setAllLoadedUpcomingEvents(displayableEvents);

    } catch (error) {
      console.error("Error loading events from server actions:", error);
      setAllLoadedUpcomingEvents([]);
    }

    if (currentUser) {
      try {
        const userGroups = await S_getAllGroups();
        const memberGroupIdsSet = new Set<string>();
        userGroups.forEach(group => {
            if (Array.isArray(group.memberIds) && group.memberIds.includes(currentUser.uid)) {
              memberGroupIdsSet.add(group.id);
            }
        });
        setMyMemberGroupIds(memberGroupIdsSet);
      } catch (groupError) {
        console.error("Error loading groups from server actions:", groupError);
        setMyMemberGroupIds(new Set()); 
      }
    } else {
      setMyMemberGroupIds(new Set()); 
    }
    setIsLoading(false);
  }, [currentUser, authLoading]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);


  const handleOpenAttendeeDialog = async (event: Event) => {
    setCurrentDialogEventId(event.id);
    setCurrentDialogEventAttendees(event.attendees || []);
    if (event.attendees && event.attendees.length > 0) {
        if (!attendeeDetailsCache[event.id]) {
            setIsLoadingDialogAttendees(true);
            try {
                const details = await S_getMultipleContactableUserDetails(event.attendees);
                setAttendeeDetailsCache(prev => ({ ...prev, [event.id]: details }));
            } catch (e) {
                console.error("Error fetching attendee details for dialog:", e);
            }
            setIsLoadingDialogAttendees(false);
        }
    }
  };


  const filteredEventsForDisplay = useMemo(() => {
    if (isLoading) return [];

    let eventsToFilter: Event[];
    if (activeTab === "upcoming") {
        eventsToFilter = allLoadedUpcomingEvents;
    } else { 
        eventsToFilter = allLoadedUpcomingEvents.filter(event => myMemberGroupIds.has(event.groupId));
    }

    if (searchTerm.trim()) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      return eventsToFilter.filter(event => 
        (event.name || '').toLowerCase().includes(lowerSearchTerm) ||
        (event.description || '').toLowerCase().includes(lowerSearchTerm) ||
        (event.location || '').toLowerCase().includes(lowerSearchTerm) ||
        (event.group || '').toLowerCase().includes(lowerSearchTerm)
      );
    }
    return eventsToFilter;
  }, [allLoadedUpcomingEvents, myMemberGroupIds, activeTab, isLoading, searchTerm]);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const renderEventCard = (event: Event) => { 
    const attendeeCount = event.attendees ? event.attendees.length : 0;
    const imageSrc = event.image || DEFAULT_EVENT_IMAGE;
    
    return (
      <Card key={event.id} className="flex flex-col shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-lg overflow-hidden">
        <CardHeader className="p-6 pb-2 flex-row gap-4 items-start">
            <Avatar className="h-12 w-12 border">
                <AvatarImage src={imageSrc} alt={event.name} />
                <AvatarFallback>{event.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
                <CardTitle className="font-headline text-xl mb-1 flex items-center">{event.name}</CardTitle>
                 <div className="flex items-center text-xs text-muted-foreground">
                    {(event.isInstance || event.isRecurring) && !event.isCancelled && (
                        <><RotateCcw className="inline h-3 w-3 mr-1"/>{t.recurring}<span className="mx-1.5">&bull;</span></>
                    )}
                    {event.isCancelled && (
                        <><XCircle className="inline h-3 w-3 mr-1 text-destructive"/>{t.cancelled}<span className="mx-1.5">&bull;</span></>
                    )}
                    <span>{event.group || "Unknown Group"}</span>
                </div>
            </div>
        </CardHeader>
        <div className="p-6 pt-2 flex flex-col flex-grow">
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            <CalendarDays className="h-4 w-4 mr-1.5 shrink-0" />
            <span>{format(new Date(event.date + 'T00:00:00Z'), 'PPP')} {event.time ? `at ${event.time}` : ''}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            <MapPin className="h-4 w-4 mr-1.5 shrink-0" /> {event.location || "Not specified"}
          </div>
          <div className="flex items-center text-sm text-muted-foreground mb-2">
            <Users2 className="h-4 w-4 mr-1.5 shrink-0" />
            {attendeeCount > 0 && !event.isCancelled ? (
                 <AlertDialog onOpenChange={(open) => { if (open) handleOpenAttendeeDialog(event); else setCurrentDialogEventId(null); }}>
                    <AlertDialogTrigger asChild><Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary hover:underline">
                        {attendeeCount} {attendeeCount === 1 ? t.attendee : t.attendees}
                      </Button></AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t.attendeesFor(event.name)}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t.attendeesDesc}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <ScrollArea className="h-[200px] rounded-md border p-2">
                        {isLoadingDialogAttendees && currentDialogEventId === event.id ? (
                            <div className="flex items-center justify-center h-full"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground"/></div>
                        ) : currentDialogEventAttendees.length === 0 ? (
                            <p className="text-muted-foreground text-center p-4">{t.noRsvps}</p>
                        ) : (
                            <div className="space-y-2">
                            {currentDialogEventAttendees.map((attendeeId) => {
                                const userDetail = attendeeDetailsCache[event.id]?.[attendeeId];
                                const isViewingOwnAttendance = currentUser && attendeeId === currentUser.uid;
                                
                                let nameToDisplay: string;
                                let avatarSrc: string;
                                let avatarFallbackChar: string;

                                if (isViewingOwnAttendance && currentUser) {
                                    nameToDisplay = currentUser.displayName || currentUser.email?.split('@')[0] || t.you;
                                    avatarSrc = attendeeDetailsCache[event.id]?.[currentUser.uid]?.avatar || getDefaultVercelAvatar(currentUser.email || currentUser.uid);
                                    avatarFallbackChar = (currentUser.displayName?.charAt(0) || currentUser.email?.charAt(0) || "Y").toUpperCase();
                                } else if (userDetail) {
                                    nameToDisplay = userDetail.name;
                                    avatarSrc = userDetail.avatar;
                                    avatarFallbackChar = userDetail.name.charAt(0).toUpperCase();
                                } else {
                                    nameToDisplay = t.user(attendeeId); 
                                    avatarSrc = getDefaultVercelAvatar(attendeeId);
                                    avatarFallbackChar = "U";
                                }
                                return (
                                <div key={attendeeId} className={`flex items-center gap-2 p-2 rounded-md ${isViewingOwnAttendance ? 'bg-secondary': ''}`}>
                                    <Avatar className="h-8 w-8"><AvatarImage src={avatarSrc} /><AvatarFallback>{avatarFallbackChar}</AvatarFallback></Avatar>
                                    <span className="font-medium">{nameToDisplay}</span>
                                    {isViewingOwnAttendance && <span className="text-xs text-primary">{t.you}</span>}
                                </div>);
                            })}
                            </div>
                        )}
                      </ScrollArea>
                      <AlertDialogFooter><AlertDialogCancel>{t.close}</AlertDialogCancel></AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
            ) : (
                 <span>{attendeeCount} {attendeeCount === 1 ? t.attendee : t.attendees}</span>
            )}
          </div>
          <CardDescription className="text-sm mb-4 flex-grow line-clamp-3">{event.description}</CardDescription>
          <CardFooter className="p-0 mt-auto pt-4 border-t ">
            <Button asChild className="w-full" size="sm" disabled={event.isCancelled}>
              <Link href={`/events/${event.id}`}>{t.viewDetails}</Link>
            </Button>
          </CardFooter>
        </div>
      </Card>
    );
  };

  const renderEmptyState = (icon: React.ElementType, title: string, description: string, ctaText?: string, ctaLink?: string) => {
    const IconComponent = icon;
    return (
      <Card className="text-center py-10 col-span-full">
        <CardHeader>
          <IconComponent className="mx-auto h-12 w-12 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {ctaText && ctaLink && (
          <CardContent>
            <Button asChild>
              <Link href={ctaLink}>
                <PlusCircle className="mr-2 h-4 w-4" /> {ctaText}
              </Link>
            </Button>
          </CardContent>
        )}
      </Card>
    );
  };

  const pageActions = (
    <>
      <div className="relative w-full max-w-xs">
        <SearchIcon className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t.searchPlaceholder}
          className="pl-8 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={isLoading || authLoading}
        />
      </div>
      <Button asChild>
        <Link href={currentUser ? "/events/create" : "/login?redirect=/events/create"}>
          <PlusCircle className="mr-2 h-4 w-4" /> {t.createEventButton}
        </Link>
      </Button>
    </>
  );

  if (isLoading || authLoading) {
    return (
      <PageShell
        title={t.pageTitle}
        description={t.loadingEvents}
        actions={pageActions}
      >
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={`skeleton-event-${i}`} className="flex flex-col shadow-lg">
              <div className="relative h-48 p-0 bg-muted animate-pulse rounded-t-lg"/>
              <div className="p-6 flex flex-col flex-grow">
                <div className="h-6 w-3/4 bg-muted animate-pulse mb-2 rounded"></div>
                <div className="h-4 w-1/2 bg-muted animate-pulse mb-1 rounded"></div>
                <div className="h-4 w-1/2 bg-muted animate-pulse mb-1 rounded"></div>
                <div className="h-4 w-1/2 bg-muted animate-pulse mb-1 rounded"></div>
                <div className="h-4 w-1/2 bg-muted animate-pulse mb-2 rounded"></div>
                <div className="h-10 w-full bg-muted animate-pulse mb-4 rounded"></div> 
                <CardFooter className="p-0 mt-auto">
                  <div className="h-10 w-full bg-muted animate-pulse rounded"></div>
                </CardFooter>
              </div>
            </Card>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title={t.pageTitle}
      description={t.pageDescription}
      actions={pageActions}
    >
      <Tabs defaultValue="upcoming" onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6"> 
          <TabsTrigger value="upcoming">
            <CalendarDays className="mr-2 h-4 w-4" /> {t.upcomingTab}
          </TabsTrigger>
          <TabsTrigger value="my-groups" disabled={!currentUser}>
            <Users2 className="mr-2 h-4 w-4" /> {t.myGroupsTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {filteredEventsForDisplay.length === 0 ? (
            searchTerm ? 
              renderEmptyState(SearchIcon, t.emptyUpcomingSearchTitle, t.emptyUpcomingSearchDesc(searchTerm))
            :
              renderEmptyState(CalendarDays, t.emptyUpcomingTitle, t.emptyUpcomingDesc, t.emptyUpcomingCta, "/events/create")
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEventsForDisplay.map(event => renderEventCard(event))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-groups">
          {!currentUser ? (
             renderEmptyState(Users2, t.emptyMyGroupsLoginTitle, t.emptyMyGroupsLoginDesc)
          ) : filteredEventsForDisplay.length === 0 ? (
             searchTerm ?
                renderEmptyState(SearchIcon, t.emptyMyGroupsSearchTitle, t.myGroupsSearchNotFoundDesc(searchTerm))
             :
                renderEmptyState(CalendarDays, t.emptyMyGroupsTitle, t.emptyMyGroupsDesc, t.emptyMyGroupsCta, "/events/create")
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEventsForDisplay.map(event => renderEventCard(event))}
            </div>
          )}
        </TabsContent>
        
      </Tabs>
    </PageShell>
  );
}
