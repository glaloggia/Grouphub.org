"use client";

import React, { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageShell } from "@/components/shared/PageShell";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, ArrowLeft, MessageSquare, Loader2, UserX } from "lucide-react"; 
import { useAuth } from "@/context/AuthContext";
import type { Conversation, ChatMessage, ContactableUser } from "@/types";
import Link from "next/link";
import { S_getMessages, S_sendMessage, S_markConversationAsRead, S_getConversations } from '@/actions/message-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { TimeAgo } from "@/components/shared/TimeAgo";
import ReactMarkdown from 'react-markdown';

interface ChatPageConversationDetails {
  id: string;
  participantIds: string[];
  isGroupChat: boolean;
  headerName: string;
  headerAvatar: string;
  originalConversationData: Conversation; 
}

const translations = {
  en: {
    loadingTitle: "Loading Chat...",
    pleaseWait: "Please wait.",
    errorTitle: "Error",
    errorDesc: "Could not load chat.",
    notFoundTitle: "Chat Not Found",
    notFoundDesc: "The requested chat does not exist or you don't have access.",
    backToChats: "Back to Chats",
    groupConversation: "Group Conversation",
    directMessage: "Direct Message",
    inputPlaceholder: "Type a message...",
    inputDisabled: "You cannot send messages in this chat.",
    user: "User",
    you: "You",
    chat: "Chat",
    groupChat: "Group Chat",
    convoNotFoundOrDenied: "Conversation not found or access denied.",
    failedToLoad: "Failed to load chat.",
    userRemoved: "User has been removed."
  },
  es: {
    loadingTitle: "Cargando Chat...",
    pleaseWait: "Por favor, espera.",
    errorTitle: "Error",
    errorDesc: "No se pudo cargar el chat.",
    notFoundTitle: "Chat no Encontrado",
    notFoundDesc: "El chat solicitado no existe o no tienes acceso.",
    backToChats: "Volver a los Chats",
    groupConversation: "Conversación de Grupo",
    directMessage: "Mensaje Directo",
    inputPlaceholder: "Escribe un mensaje...",
    inputDisabled: "No puedes enviar mensajes en este chat.",
    user: "Usuario",
    you: "Tú",
    chat: "Chat",
    groupChat: "Chat de Grupo",
    convoNotFoundOrDenied: "Conversación no encontrada o acceso denegado.",
    failedToLoad: "No se pudo cargar el chat.",
    userRemoved: "El usuario ha sido eliminado."
  },
  pt: {
    loadingTitle: "Carregando Bate-papo...",
    pleaseWait: "Por favor, aguarde.",
    errorTitle: "Erro",
    errorDesc: "Não foi possível carregar o bate-papo.",
    notFoundTitle: "Bate-papo Não Encontrado",
    notFoundDesc: "O bate-papo solicitado não existe ou você não tem acesso.",
    backToChats: "Voltar para os Bate-papos",
    groupConversation: "Conversa em Grupo",
    directMessage: "Mensagem Direta",
    inputPlaceholder: "Digite uma mensagem...",
    inputDisabled: "Você não pode enviar mensagens neste bate-papo.",
    user: "Usuário",
    you: "Você",
    chat: "Chat",
    groupChat: "Chat em Grupo",
    convoNotFoundOrDenied: "Conversa não encontrada ou acesso negado.",
    failedToLoad: "Falha ao carregar o bate-papo.",
    userRemoved: "O usuário foi removido."
  },
  fr: {
    loadingTitle: "Chargement de la Discussion...",
    pleaseWait: "Veuillez patienter.",
    errorTitle: "Erreur",
    errorDesc: "Impossible de charger la discussion.",
    notFoundTitle: "Discussion non Trouvée",
    notFoundDesc: "La discussion demandée n'existe pas ou vous n'y avez pas accès.",
    backToChats: "Retour aux Discussions",
    groupConversation: "Conversation de Groupe",
    directMessage: "Message Direct",
    inputPlaceholder: "Écrire un message...",
    inputDisabled: "Vous ne pouvez pas envoyer de messages dans cette discussion.",
    user: "Utilisateur",
    you: "Vous",
    chat: "Discussion",
    groupChat: "Discussion de Groupe",
    convoNotFoundOrDenied: "Conversation non trouvée ou accès refusé.",
    failedToLoad: "Échec du chargement de la discussion.",
    userRemoved: "L'utilisateur a été supprimé."
  },
  de: {
    loadingTitle: "Lade Chat...",
    pleaseWait: "Bitte warten.",
    errorTitle: "Fehler",
    errorDesc: "Chat konnte nicht geladen werden.",
    notFoundTitle: "Chat nicht gefunden",
    notFoundDesc: "Der angeforderte Chat existiert nicht oder Sie haben keinen Zugriff.",
    backToChats: "Zurück zu den Chats",
    groupConversation: "Gruppenunterhaltung",
    directMessage: "Direktnachricht",
    inputPlaceholder: "Nachricht schreiben...",
    inputDisabled: "Sie können in diesem Chat keine Nachrichten senden.",
    user: "Benutzer",
    you: "Du",
    chat: "Chat",
    groupChat: "Gruppen-Chat",
    convoNotFoundOrDenied: "Unterhaltung nicht gefunden oder Zugriff verweigert.",
    failedToLoad: "Chat konnte nicht geladen werden.",
    userRemoved: "Benutzer wurde entfernt."
  },
  it: {
    loadingTitle: "Caricamento Chat...",
    pleaseWait: "Attendere prego.",
    errorTitle: "Errore",
    errorDesc: "Impossibile caricare la chat.",
    notFoundTitle: "Chat Non Trovata",
    notFoundDesc: "La chat richiesta non esiste o non hai accesso.",
    backToChats: "Torna alle Chat",
    groupConversation: "Conversazione di Gruppo",
    directMessage: "Messaggio Diretto",
    inputPlaceholder: "Scrivi un messaggio...",
    inputDisabled: "Non puoi inviare messaggi in questa chat.",
    user: "Utente",
    you: "Tu",
    chat: "Chat",
    groupChat: "Chat di Gruppo",
    convoNotFoundOrDenied: "Conversazione non trovata o accesso negato.",
    failedToLoad: "Impossibile caricare la chat.",
    userRemoved: "L'utente è stato rimosso."
  },
  ru: {
    loadingTitle: "Загрузка чата...",
    pleaseWait: "Пожалуйста, подождите.",
    errorTitle: "Ошибка",
    errorDesc: "Не удалось загрузить чат.",
    notFoundTitle: "Чат не найден",
    notFoundDesc: "Запрошенный чат не существует или у вас нет доступа.",
    backToChats: "Назад к чатам",
    groupConversation: "Групповой чат",
    directMessage: "Личное сообщение",
    inputPlaceholder: "Введите сообщение...",
    inputDisabled: "Вы не можете отправлять сообщения в этом чате.",
    user: "Пользователь",
    you: "Вы",
    chat: "Чат",
    groupChat: "Групповой чат",
    convoNotFoundOrDenied: "Разговор не найден или доступ запрещен.",
    failedToLoad: "Не удалось загрузить чат.",
    userRemoved: "Пользователь был удален."
  }
};


export default function ChatDetailPage() {
  const params = useParams<{ chatId: string }>();
  const chatId = params.chatId;
  const router = useRouter();
  const { currentUser, loading: authLoading } = useAuth();

  const [chatDetails, setChatDetails] = useState<ChatPageConversationDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOtherUserRemoved, setIsOtherUserRemoved] = useState<boolean>(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (chatDetails) {
      document.title = `${chatDetails.headerName} | GroupHub`;
    }
  }, [chatDetails]);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const loadChatData = useCallback(async () => {
    if (authLoading || !currentUser || !chatId) {
      return;
    }
    setIsLoading(true);
    setError(null);
    setIsOtherUserRemoved(false);

    try {
      const userConvos = await S_getConversations(currentUser.uid);
      const foundConvo = userConvos.find(c => c.id === chatId);

      if (!foundConvo) { 
        setError(t.convoNotFoundOrDenied);
        setChatDetails(null); setMessages([]); setIsLoading(false);
        return;
      }
      
      let headerNameToSet = t.chat;
      let headerAvatarToSet = `https://placehold.co/40x40.png?text=??`;

      if (foundConvo.isGroupChat) {
          headerNameToSet = foundConvo.name || t.groupChat;
          headerAvatarToSet = foundConvo.avatar || `https://placehold.co/40x40.png?text=${headerNameToSet.substring(0,2)}`;
      } else {
          const otherParticipantId = foundConvo.participantIds.find(id => id !== currentUser.uid);
          if (otherParticipantId && foundConvo.participantDetails && foundConvo.participantDetails[otherParticipantId]) {
              headerNameToSet = foundConvo.participantDetails[otherParticipantId]?.name || t.user;
              headerAvatarToSet = foundConvo.participantDetails[otherParticipantId]?.avatar || `https://avatar.vercel.sh/${otherParticipantId}.png`;
          } else {
              headerNameToSet = t.userRemoved;
              headerAvatarToSet = `https://avatar.vercel.sh/Deleted.png?text=X`;
              setIsOtherUserRemoved(true);
          }
      }

      setChatDetails({
        id: foundConvo.id,
        participantIds: foundConvo.participantIds,
        isGroupChat: foundConvo.isGroupChat,
        headerName: headerNameToSet,
        headerAvatar: headerAvatarToSet,
        originalConversationData: foundConvo
      });

      const loadedMessages = await S_getMessages(chatId, currentUser.uid);
      setMessages(loadedMessages); 

      if (foundConvo.unreadCount > 0 && foundConvo.lastMessageSenderId !== currentUser.uid) {
        await S_markConversationAsRead(chatId, currentUser.uid);
        dispatchStorageUpdatedEvent(); 
      }
      
    } catch (e: any) {
      console.error("Error loading chat details from server:", e);
      setError(e.message || t.failedToLoad);
      setChatDetails(null); setMessages([]);
    } finally {
        setIsLoading(false);
        setTimeout(() => scrollToBottom("auto"), 100);
    }
  }, [chatId, currentUser, authLoading, t]);

  useEffect(() => {
    loadChatData();
  }, [loadChatData]); 


  const handleSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || !currentUser || !chatDetails) return;

    const optimisticMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId: chatDetails.id,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || currentUser.email?.split('@')[0] || t.user,
        senderAvatar: currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.uid}.png`,
        text: newMessageText.trim(),
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    setMessages(prevMessages => [...prevMessages, optimisticMessage]);
    setNewMessageText(""); 
    scrollToBottom();

    try {
      const result = await S_sendMessage({
          conversationId: chatDetails.id,
          senderId: currentUser.uid,
          senderName: currentUser.displayName || currentUser.email?.split('@')[0] || t.user,
          senderAvatar: currentUser.photoURL || `https://avatar.vercel.sh/${currentUser.uid}.png`,
          text: optimisticMessage.text,
      });

      if (result.success && result.message) {
        setMessages(prev => prev.map(m => m.id === optimisticMessage.id ? result.message! as ChatMessage : m));
        dispatchStorageUpdatedEvent(); 
      } else {
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
        setNewMessageText(optimisticMessage.text); 
      }
    } catch (error) {
      console.error("Error calling S_sendMessage:", error);
      setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
      setNewMessageText(optimisticMessage.text);
    }
  };
  
  const pageActions = (
     <Button variant="outline" size="sm" asChild>
        <Link href="/messages">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToChats}
        </Link>
    </Button>
  );

  if (isLoading || authLoading) { 
    return (
      <PageShell title={t.loadingTitle} description={t.pleaseWait} actions={pageActions}>
        <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg shadow-lg">
            <div className="p-4 border-b flex items-center gap-3 h-16 bg-muted animate-pulse" />
            <div className="flex-1 p-4 space-y-4 bg-muted animate-pulse"/>
            <div className="p-4 border-t h-16 bg-muted animate-pulse"/>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell title={t.errorTitle} description={error} actions={pageActions}>
        <div className="flex flex-col items-center justify-center text-center p-4 h-[calc(100vh-12rem)] border rounded-lg shadow-lg">
            <MessageSquare className="h-16 w-16 text-destructive mb-4" />
            <p className="text-lg">{t.errorDesc}</p>
        </div>
      </PageShell>
    );
  }

  if (!chatDetails) {
     return (
      <PageShell title={t.notFoundTitle} description={t.notFoundDesc} actions={pageActions}>
         <div className="flex flex-col items-center justify-center text-center p-4 h-[calc(100vh-12rem)] border rounded-lg shadow-lg">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
        </div>
      </PageShell>
    );
  }

  const canSendMessage = currentUser && !isOtherUserRemoved; 

  return (
    <PageShell title={chatDetails.headerName} description={chatDetails.isGroupChat ? t.groupConversation : t.directMessage} actions={pageActions}>
      <div className="flex flex-col h-[calc(100vh-12rem)] border rounded-lg shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3 bg-card">
          <Avatar className="h-10 w-10">
            <AvatarImage src={chatDetails.headerAvatar} />
            <AvatarFallback>{chatDetails.headerName?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className={`text-lg font-semibold font-headline ${isOtherUserRemoved ? 'text-muted-foreground' : ''}`}>{chatDetails.headerName}</h2>
          </div>
        </div>

        <ScrollArea className="flex-1 bg-card/50" ref={scrollAreaRef}>
          <div className="p-4 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.senderId === currentUser?.uid ? 'justify-end' : 'justify-start'}`}>
                 {msg.senderId !== currentUser?.uid && (
                    <Link href={`/profile/${msg.senderId}`} passHref legacyBehavior>
                      <a className="mr-2 self-end cursor-pointer">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.senderAvatar} />
                            <AvatarFallback>{msg.senderName?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                        </Avatar>
                      </a>
                    </Link>
                 )}
                <div className={`max-w-[70%] p-3 rounded-lg shadow ${msg.senderId === currentUser?.uid ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                  {msg.senderId !== currentUser?.uid && <p className="text-xs font-semibold mb-0.5">{msg.senderName}</p>}
                  <div className="prose prose-sm dark:prose-invert max-w-none text-foreground break-words">
                      <ReactMarkdown
                        components={{
                          p: ({ node, ...props }) => <p className="my-0" {...props} />,
                          a: ({node, ...props}) => <a className="text-primary-foreground underline hover:no-underline" target="_blank" rel="noopener noreferrer" {...props} />
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                  </div>
                  <div className={`text-xs mt-1 ${msg.senderId === currentUser?.uid ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                    <TimeAgo dateString={msg.timestamp} />
                  </div>
                </div>
                 {msg.senderId === currentUser?.uid && currentUser && (
                    <Link href={`/profile/${currentUser.uid}`} passHref legacyBehavior>
                      <a className="ml-2 self-end cursor-pointer">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={msg.senderAvatar} />
                            <AvatarFallback>{currentUser?.displayName?.[0]?.toUpperCase() || "Y"}</AvatarFallback>
                        </Avatar>
                      </a>
                    </Link>
                 )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card">
          <form onSubmit={handleSendMessage} >
            <div className="flex items-center gap-2">
              <Input
                placeholder={canSendMessage ? t.inputPlaceholder : t.inputDisabled}
                className="flex-1"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                disabled={!canSendMessage}
              />
              <Button type="submit" disabled={!canSendMessage || !newMessageText.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </PageShell>
  );
}