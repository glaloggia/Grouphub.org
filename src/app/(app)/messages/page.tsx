

"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Search, PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import type { Conversation } from "@/types";
import { S_getConversations } from '@/actions/message-actions'; 
import { S_getMultipleContactableUserDetails } from '@/actions/user-profile-actions';
import { TimeAgo } from "@/components/shared/TimeAgo";

// Extended Conversation type for display purposes
interface DisplayConversation extends Conversation {
  displayInfo: {
    name: string;
    avatar: string;
  };
}

const translations = {
  en: {
    pageTitle: "Messages",
    pageDescription: "Your direct messages and group chats.",
    searchPlaceholder: "Search messages...",
    createButton: "New Message",
    loading: "Loading your chats...",
    noConvos: "No conversations yet.",
    startNewChat: "Start a new chat",
    noMatch: "No conversations match your search.",
    lastMessageYou: "You: ",
    noMessagesYet: "No messages yet.",
    chat: "Chat",
    user: "User",
    groupChat: "Group Chat"
  },
  es: {
    pageTitle: "Mensajes",
    pageDescription: "Tus mensajes directos y chats de grupo.",
    searchPlaceholder: "Buscar mensajes...",
    createButton: "Nuevo Mensaje",
    loading: "Cargando tus chats...",
    noConvos: "Aún no hay conversaciones.",
    startNewChat: "Comenzar un nuevo chat",
    noMatch: "Ninguna conversación coincide con tu búsqueda.",
    lastMessageYou: "Tú: ",
    noMessagesYet: "Aún no hay mensajes.",
    chat: "Chat",
    user: "Usuario",
    groupChat: "Chat de Grupo"
  },
  pt: {
    pageTitle: "Mensagens",
    pageDescription: "Suas mensagens diretas e chats de grupo.",
    searchPlaceholder: "Pesquisar mensagens...",
    createButton: "Nova Mensagem",
    loading: "Carregando seus chats...",
    noConvos: "Ainda não há conversas.",
    startNewChat: "Iniciar uma nova conversa",
    noMatch: "Nenhuma conversa corresponde à sua pesquisa.",
    lastMessageYou: "Você: ",
    noMessagesYet: "Ainda não há mensagens.",
    chat: "Chat",
    user: "Usuário",
    groupChat: "Chat em Grupo"
  },
  fr: {
    pageTitle: "Messages",
    pageDescription: "Vos messages directs et discussions de groupe.",
    searchPlaceholder: "Rechercher des messages...",
    createButton: "Nouveau Message",
    loading: "Chargement de vos discussions...",
    noConvos: "Aucune conversation pour le moment.",
    startNewChat: "Commencer une nouvelle discussion",
    noMatch: "Aucune conversation ne correspond à votre recherche.",
    lastMessageYou: "Vous: ",
    noMessagesYet: "Aucun message pour l'instant.",
    chat: "Discussion",
    user: "Utilisateur",
    groupChat: "Discussion de groupe"
  },
  de: {
    pageTitle: "Nachrichten",
    pageDescription: "Ihre Direktnachrichten und Gruppenchats.",
    searchPlaceholder: "Nachrichten suchen...",
    createButton: "Neue Nachricht",
    loading: "Lade deine Chats...",
    noConvos: "Noch keine Unterhaltungen.",
    startNewChat: "Einen neuen Chat starten",
    noMatch: "Keine Unterhaltungen entsprechen Ihrer Suche.",
    lastMessageYou: "Du: ",
    noMessagesYet: "Noch keine Nachrichten.",
    chat: "Chat",
    user: "Benutzer",
    groupChat: "Gruppen-Chat"
  },
  it: {
    pageTitle: "Messaggi",
    pageDescription: "I tuoi messaggi diretti e le chat di gruppo.",
    searchPlaceholder: "Cerca messaggi...",
    createButton: "Nuovo Messaggio",
    loading: "Caricamento delle tue chat...",
    noConvos: "Ancora nessuna conversazione.",
    startNewChat: "Inizia una nuova chat",
    noMatch: "Nessuna conversazione corrisponde alla tua ricerca.",
    lastMessageYou: "Tu: ",
    noMessagesYet: "Ancora nessun messaggio.",
    chat: "Chat",
    user: "Utente",
    groupChat: "Chat di Gruppo"
  },
  ru: {
    pageTitle: "Сообщения",
    pageDescription: "Ваши личные сообщения и групповые чаты.",
    searchPlaceholder: "Поиск сообщений...",
    createButton: "Новое сообщение",
    loading: "Загрузка ваших чатов...",
    noConvos: "Пока нет разговоров.",
    startNewChat: "Начать новый чат",
    noMatch: "Нет разговоров, соответствующих вашему поиску.",
    lastMessageYou: "Вы: ",
    noMessagesYet: "Пока нет сообщений.",
    chat: "Чат",
    user: "Пользователь",
    groupChat: "Групповой чат"
  }
};


export default function MessagesListPage() {
  const { currentUser, loading: authLoading } = useAuth();
  const [allConversations, setAllConversations] = useState<DisplayConversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0] as 'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru';
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  const t = translations[lang] || translations['en'];

  useEffect(() => {
    document.title = `${t.pageTitle} | GroupHub`;
  }, [t]);

  const fetchConversations = useCallback(async () => {
    if (!currentUser) {
      setAllConversations([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const rawConversations = await S_getConversations(currentUser.uid);
      
      const processedConversations: DisplayConversation[] = rawConversations.map(convo => {
        let displayName = t.chat;
        let displayAvatar = `https://placehold.co/40x40.png?text=??`;

        if (convo.isGroupChat) {
            displayName = convo.name || t.groupChat;
            displayAvatar = convo.avatar || `https://placehold.co/40x40.png?text=${displayName.substring(0,2)}`;
        } else {
            const otherParticipantId = convo.participantIds.find(id => id !== currentUser.uid);
            if (otherParticipantId && convo.participantDetails) {
                displayName = convo.participantDetails[otherParticipantId]?.name || t.user;
                displayAvatar = convo.participantDetails[otherParticipantId]?.avatar || `https://avatar.vercel.sh/${otherParticipantId}.png`;
            }
        }

        return {
          ...convo,
          displayInfo: {
            name: displayName,
            avatar: displayAvatar,
          }
        };
      });
      
      setAllConversations(processedConversations);

    } catch (error) {
      console.error("Error loading conversations:", error);
      setAllConversations([]);
    }
    setIsLoading(false);
  }, [currentUser, t]);


  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    fetchConversations();
     const handleStorageChange = () => {
        fetchConversations();
    };
    window.addEventListener('storageUpdated', handleStorageChange);
    return () => {
        window.removeEventListener('storageUpdated', handleStorageChange);
    };
  }, [currentUser, authLoading, fetchConversations]);


  const displayedConversations = useMemo(() => {
    if (!searchTerm.trim()) {
      return allConversations;
    }
    const lowerSearchTerm = searchTerm.toLowerCase();
    return allConversations.filter(
      (convo) =>
        (convo.displayInfo.name?.toLowerCase() || "").includes(lowerSearchTerm) ||
        (convo.lastMessageText?.toLowerCase() || "").includes(lowerSearchTerm)
    );
  }, [allConversations, searchTerm]);

  const pageActions = (
    <Button variant="outline" size="sm" asChild>
      <Link href="/messages/new">
        <PlusCircle className="mr-2 h-4 w-4" /> {t.createButton}
      </Link>
    </Button>
  );

  if (isLoading || authLoading) {
      return (
          <PageShell title={t.pageTitle} description={t.loading} actions={pageActions}>
              <div className="border rounded-lg shadow-lg h-[calc(100vh-12rem)]">
                  <div className="p-4"><Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" /></div>
                  <div className="p-4 space-y-3">
                      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}
                  </div>
              </div>
          </PageShell>
      );
  }

  return (
    <PageShell title={t.pageTitle} description={t.pageDescription} actions={pageActions}>
      <div className="h-[calc(100vh-12rem)] border rounded-lg overflow-hidden shadow-lg bg-background flex flex-col">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder={t.searchPlaceholder} 
              className="pl-8" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {displayedConversations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? t.noMatch : t.noConvos}
            </p>
            {!searchTerm && (
               <Button variant="link" asChild className="mt-2"><Link href="/messages/new">{t.startNewChat}</Link></Button>
            )}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            {displayedConversations.map(convo => (
              <Link href={`/messages/${convo.id}`} key={convo.id} legacyBehavior>
                <a className="flex items-center gap-3 p-4 hover:bg-secondary/50 cursor-pointer border-b last:border-b-0">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={convo.displayInfo.avatar} alt={convo.displayInfo.name} />
                    <AvatarFallback>{convo.displayInfo.name?.substring(0, 2).toUpperCase() || "???"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-center">
                        <h3 className={`font-medium truncate ${convo.unreadCount > 0 && convo.lastMessageSenderId !== currentUser?.uid ? 'font-bold text-foreground' : 'text-muted-foreground'}`}>{convo.displayInfo.name}</h3>
                        {convo.lastMessageTimestamp && (
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                              <TimeAgo dateString={convo.lastMessageTimestamp} />
                          </span>
                        )}
                    </div>
                    <p className={`text-sm truncate ${convo.unreadCount > 0 && convo.lastMessageSenderId !== currentUser?.uid ? 'text-foreground font-semibold' : 'text-muted-foreground'}`}>
                      {convo.lastMessageSenderId === currentUser?.uid ? `${t.lastMessageYou}${convo.lastMessageText}` : convo.lastMessageText || t.noMessagesYet}
                    </p>
                  </div>
                  {convo.unreadCount > 0 && convo.lastMessageSenderId !== currentUser?.uid && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                      {convo.unreadCount > 9 ? '9+' : convo.unreadCount}
                    </span>
                  )}
                </a>
              </Link>
            ))}
          </ScrollArea>
        )}
      </div>
    </PageShell>
  );
}
