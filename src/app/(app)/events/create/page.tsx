
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, MapPin, Users, Info, UploadCloud, RotateCcw, ShieldAlert, Loader2, Copy, Clock } from "lucide-react";
import Link from "next/link";
import React, { useState, type FormEvent, useEffect, Suspense, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import type { Event as FullEventData, RecurrenceRule, Group as StoredGroup } from "@/types";
import Image from "next/image";
import { createEvent, S_getEventsForGroup } from '@/actions/event-actions';
import { getAllGroups } from '@/actions/group-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";
import { generateEventOccurrences, isEventInstancePast } from "@/lib/event-utils";
import { addMonths, startOfDay, subMonths, parseISO, formatISO } from "date-fns";


const DEFAULT_EVENT_IMAGE = "https://placehold.co/600x400.png";
const DAYS_OF_WEEK = [
  { id: 1, label: "Mon" }, { id: 2, label: "Tue" }, { id: 3, label: "Wed" },
  { id: 4, label: "Thu" }, { id: 5, label: "Fri" }, { id: 6, label: "Sat" }, { id: 0, label: "Sun" }
];
const MAX_ORIGINAL_IMAGE_SIZE_MB = 2;

interface EventListItem extends Omit<FullEventData, 'id'> {
    id: string;
}

const translations = {
  en: {
    pageTitle: "Create New Event",
    pageDescription: "Fill in the details below to schedule a new event.",
    loadingTitle: "Create New Event",
    loadingDescription: "Loading form...",
    loadingCard: "Loading Event Form...",
    eventDetails: "Event Details",
    eventDetailsDesc: "Provide information about the event you want to create.",
    eventName: "Event Name",
    eventNamePlaceholder: "e.g., Summer BBQ Bash",
    description: "Description",
    descriptionPlaceholder: "Tell us more about the event...",
    date: "Date",
    startDate: "Start Date",
    time: "Time",
    duration: "Duration (in hours)",
    location: "Location",
    locationPlaceholder: "e.g., Central Park or Online",
    image: "Event Image (Optional)",
    imagePreview: "Selected event image preview",
    imageSizeNote: (size: number) => `Please avoid very large images. Max original size: ${size}MB.`,
    group: "Group",
    copyFromPast: "Copy from past event (optional)",
    copyFromPastPlaceholder: "Select a past event to copy",
    noPastEvents: "No past events to copy from",
    recurring: "Make this a recurring event?",
    frequency: "Frequency",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    repeatEvery: "Repeat Every",
    days: "day(s)",
    weeks: "week(s)",
    months: "month(s)",
    repeatOn: "Repeat on",
    dayOfMonth: "Day of Month",
    dayOfMonthPlaceholder: "e.g., 15",
    repeatUntil: "Repeat Until (Optional)",
    repeatUntilDesc: "If blank, the event will repeat indefinitely.",
    cancel: "Cancel",
    creating: "Creating Event...",
    create: "Create Event",
    selectGroupPlaceholder: "Select a group you can manage",
    loadingGroups: "Loading groups...",
    loginToSelect: "Log in to select a group.",
    noGroups: "No groups available (must be admin/creator).",
    error_mustBeAdmin: "You must be an admin or creator of a group to schedule events.",
    error_pleaseSelectGroup: "Please select a group.",
    error_memberRequired: (name: string) => `You must be a member of "${name}" to create an event for it.`,
    error_adminRequired: (name: string) => `You must be an admin or creator of "${name}" to schedule events.`,
    error_groupNotFound: "Selected group not found. Cannot create event.",
    error_nameRequired: "Event name is required.",
    error_dateRequired: "Event date is required.",
    error_datePast: "Event date cannot be in the past.",
    error_interval: "Interval must be at least 1.",
    error_weeklySelection: "Please select at least one day of the week for weekly recurrence.",
    error_monthlySelection: "Please enter a valid day of the month (1-31) for monthly recurrence.",
    error_endDate: "Recurrence end date cannot be before the event start date.",
    toast_loginRequired_title: "Login Required",
    toast_loginRequired_desc: "Please log in to create a group.",
    toast_cannotCreate_title: "Cannot Create Event",
    toast_groupDetailsMissing_title: "Error",
    toast_groupDetailsMissing_desc: "Selected group details are missing.",
    toast_membershipRequired_title: "Membership Required",
    toast_membershipRequired_desc: (name: string) => `You are not a member of "${name}".`,
    toast_permissionDenied_title: "Permission Denied",
    toast_permissionDenied_desc: (name: string) => `Only admins or the creator can schedule events for "${name}".`,
    toast_eventCreated_title: "Event Created!",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `Event "${eventName}" for group "${groupName}" has been scheduled. You have been automatically added as an attendee.`,
    toast_error_title: "Error",
    toast_error_desc_server: "Failed to create event on the server.",
    toast_error_desc_unexpected: "An unexpected error occurred. Please try again.",
    toast_error_desc_save: "Failed to save event.",
  },
  es: {
    pageTitle: "Crear Nuevo Evento",
    pageDescription: "Rellena los detalles a continuación para programar un nuevo evento.",
    loadingTitle: "Crear Nuevo Evento",
    loadingDescription: "Cargando formulario...",
    loadingCard: "Cargando Formulario de Evento...",
    eventDetails: "Detalles del Evento",
    eventDetailsDesc: "Proporciona información sobre el evento que quieres crear.",
    eventName: "Nombre del Evento",
    eventNamePlaceholder: "p.ej., Fiesta de Barbacoa de Verano",
    description: "Descripción",
    descriptionPlaceholder: "Cuéntanos más sobre el evento...",
    date: "Fecha",
    startDate: "Fecha de Inicio",
    time: "Hora",
    duration: "Duración (en horas)",
    location: "Ubicación",
    locationPlaceholder: "p.ej., Parque Central o En Línea",
    image: "Imagen del Evento (Opcional)",
    imagePreview: "Vista previa de la imagen del evento seleccionada",
    imageSizeNote: (size: number) => `Por favor, evita imágenes muy grandes. Tamaño original máximo: ${size}MB.`,
    group: "Grupo",
    copyFromPast: "Copiar de un evento pasado (opcional)",
    copyFromPastPlaceholder: "Selecciona un evento pasado para copiar",
    noPastEvents: "No hay eventos pasados para copiar",
    recurring: "¿Hacer de este un evento recurrente?",
    frequency: "Frecuencia",
    daily: "Diariamente",
    weekly: "Semanalmente",
    monthly: "Mensualmente",
    repeatEvery: "Repetir cada",
    days: "día(s)",
    weeks: "semana(s)",
    months: "mes(es)",
    repeatOn: "Repetir en",
    dayOfMonth: "Día del Mes",
    dayOfMonthPlaceholder: "p.ej., 15",
    repeatUntil: "Repetir Hasta (Opcional)",
    repeatUntilDesc: "Si se deja en blanco, se repetirá indefinidamente.",
    cancel: "Cancelar",
    creating: "Creando Evento...",
    create: "Crear Evento",
    selectGroupPlaceholder: "Selecciona un grupo que puedas gestionar",
    loadingGroups: "Cargando grupos...",
    loginToSelect: "Inicia sesión para seleccionar un grupo.",
    noGroups: "No hay grupos disponibles (debes ser admin/creador).",
    error_mustBeAdmin: "Debes ser administrador o creador de un grupo para programar eventos.",
    error_pleaseSelectGroup: "Por favor, selecciona un grupo.",
    error_memberRequired: (name: string) => `Debes ser miembro de "${name}" para crear un evento para él.`,
    error_adminRequired: (name: string) => `Debes ser administrador o creador de "${name}" para programar eventos.`,
    error_groupNotFound: "Grupo seleccionado no encontrado. No se puede crear el evento.",
    error_nameRequired: "El nombre del evento es obligatorio.",
    error_dateRequired: "La fecha del evento es obligatoria.",
    error_datePast: "La fecha del evento no puede ser en el pasado.",
    error_interval: "El intervalo debe ser al menos 1.",
    error_weeklySelection: "Por favor, selecciona al menos un día de la semana para la recurrencia semanal.",
    error_monthlySelection: "Por favor, introduce un día del mes válido (1-31) para la recurrencia mensual.",
    error_endDate: "La fecha de finalización de la recurrencia no puede ser anterior a la fecha de inicio del evento.",
    toast_loginRequired_title: "Se Requiere Iniciar Sesión",
    toast_loginRequired_desc: "Por favor, inicia sesión para crear un grupo.",
    toast_cannotCreate_title: "No se Puede Crear el Evento",
    toast_groupDetailsMissing_title: "Error",
    toast_groupDetailsMissing_desc: "Faltan los detalles del grupo seleccionado.",
    toast_membershipRequired_title: "Se Requiere Ser Miembro",
    toast_membershipRequired_desc: (name: string) => `No eres miembro de "${name}".`,
    toast_permissionDenied_title: "Permiso Denegado",
    toast_permissionDenied_desc: (name: string) => `Solo los administradores o el creador pueden programar eventos para "${name}".`,
    toast_eventCreated_title: "¡Evento Creado!",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `El evento "${eventName}" para el grupo "${groupName}" ha sido programado. Has sido añadido automáticamente como asistente.`,
    toast_error_title: "Error",
    toast_error_desc_server: "Falló al crear el evento en el servidor.",
    toast_error_desc_unexpected: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
    toast_error_desc_save: "Falló al guardar el evento.",
  },
  pt: {
    pageTitle: "Criar Novo Evento",
    pageDescription: "Preencha os detalhes abaixo para agendar um novo evento.",
    loadingTitle: "Criar Novo Evento",
    loadingDescription: "Carregando formulário...",
    loadingCard: "Carregando Formulário de Evento...",
    eventDetails: "Detalhes do Evento",
    eventDetailsDesc: "Forneça informações sobre o evento que deseja criar.",
    eventName: "Nome do Evento",
    eventNamePlaceholder: "ex., Churrasco de Verão",
    description: "Descrição",
    descriptionPlaceholder: "Conte-nos mais sobre o evento...",
    date: "Data",
    startDate: "Data de Início",
    time: "Hora",
    duration: "Duração (em horas)",
    location: "Local",
    locationPlaceholder: "ex., Parque Central ou Online",
    image: "Imagem do Evento (Opcional)",
    imagePreview: "Pré-visualização da imagem do evento selecionada",
    imageSizeNote: (size: number) => `Por favor, evite imagens muito grandes. Tamanho original máximo: ${size}MB.`,
    group: "Grupo",
    copyFromPast: "Copiar de evento anterior (opcional)",
    copyFromPastPlaceholder: "Selecione um evento anterior para copiar",
    noPastEvents: "Nenhum evento anterior para copiar",
    recurring: "Tornar este um evento recorrente?",
    frequency: "Frequência",
    daily: "Diariamente",
    weekly: "Semanalmente",
    monthly: "Mensalmente",
    repeatEvery: "Repetir a cada",
    days: "dia(s)",
    weeks: "semana(s)",
    months: "mês(es)",
    repeatOn: "Repetir em",
    dayOfMonth: "Dia do Mês",
    dayOfMonthPlaceholder: "ex., 15",
    repeatUntil: "Repetir Até (Opcional)",
    repeatUntilDesc: "Se deixado em branco, repetirá indefinidamente.",
    cancel: "Cancelar",
    creating: "Criando Evento...",
    create: "Criar Evento",
    selectGroupPlaceholder: "Selecione um grupo que você pode gerenciar",
    loadingGroups: "Carregando grupos...",
    loginToSelect: "Faça login para selecionar um grupo.",
    noGroups: "Nenhum grupo disponível (deve ser admin/criador).",
    error_mustBeAdmin: "Você deve ser um administrador ou criador de um grupo para agendar eventos.",
    error_pleaseSelectGroup: "Por favor, selecione um grupo.",
    error_memberRequired: (name: string) => `Você deve ser membro de "${name}" para criar um evento para ele.`,
    error_adminRequired: (name: string) => `Você deve ser administrador ou criador de "${name}" para agendar eventos.`,
    error_groupNotFound: "Grupo selecionado não encontrado. Não é possível criar o evento.",
    error_nameRequired: "O nome do evento é obrigatório.",
    error_dateRequired: "A data do evento é obrigatória.",
    error_datePast: "A data do evento não pode ser no passado.",
    error_interval: "O intervalo deve ser de pelo menos 1.",
    error_weeklySelection: "Por favor, selecione pelo menos um dia da semana para a recorrência semanal.",
    error_monthlySelection: "Por favor, insira um dia do mês válido (1-31) para a recorrência mensal.",
    error_endDate: "A data de término da recorrência não pode ser anterior à data de início do evento.",
    toast_loginRequired_title: "Login Necessário",
    toast_loginRequired_desc: "Por favor, faça login para criar um grupo.",
    toast_cannotCreate_title: "Não é Possível Criar o Evento",
    toast_groupDetailsMissing_title: "Erro",
    toast_groupDetailsMissing_desc: "Faltam detalhes do grupo selecionado.",
    toast_membershipRequired_title: "É Necessário Ser Membro",
    toast_membershipRequired_desc: (name: string) => `Você não é membro de "${name}".`,
    toast_permissionDenied_title: "Permissão Negada",
    toast_permissionDenied_desc: (name: string) => `Apenas administradores ou o criador podem agendar eventos para "${name}".`,
    toast_eventCreated_title: "Evento Criado!",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `O evento "${eventName}" para o grupo "${groupName}" foi agendado. Você foi adicionado automaticamente como participante.`,
    toast_error_title: "Erro",
    toast_error_desc_server: "Falha ao criar o evento no servidor.",
    toast_error_desc_unexpected: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    toast_error_desc_save: "Falha ao salvar o evento.",
  },
  fr: {
    pageTitle: "Créer un Nouvel Événement",
    pageDescription: "Remplissez les détails ci-dessous pour programmer un nouvel événement.",
    loadingTitle: "Créer un Nouvel Événement",
    loadingDescription: "Chargement du formulaire...",
    loadingCard: "Chargement du Formulaire de Groupe...",
    eventDetails: "Détails de l'Événement",
    eventDetailsDesc: "Fournissez des informations sur l'événement que vous souhaitez créer.",
    eventName: "Nom de l'Événement",
    eventNamePlaceholder: "ex., Fête BBQ d'été",
    description: "Description",
    descriptionPlaceholder: "Parlez-nous un peu plus de l'événement...",
    date: "Date",
    startDate: "Date de Début",
    time: "Heure",
    duration: "Durée (en heures)",
    location: "Lieu",
    locationPlaceholder: "ex., Parc Central ou En ligne",
    image: "Image de l'Événement (Optionnel)",
    imagePreview: "Aperçu de l'image de l'événement sélectionnée",
    imageSizeNote: (size: number) => `Veuillez éviter les images très volumineuses. Taille originale maximale : ${size}Mo.`,
    group: "Groupe",
    copyFromPast: "Copier d'un événement passé (optionnel)",
    copyFromPastPlaceholder: "Sélectionnez un événement passé à copier",
    noPastEvents: "Aucun événement passé à copier",
    recurring: "Faire de cet événement un événement récurrent ?",
    frequency: "Fréquence",
    daily: "Quotidien",
    weekly: "Hebdomadaire",
    monthly: "Mensuel",
    repeatEvery: "Répéter tous les",
    days: "jour(s)",
    weeks: "semaine(s)",
    months: "mois",
    repeatOn: "Répéter le",
    dayOfMonth: "Jour du Mois",
    dayOfMonthPlaceholder: "ex., 15",
    repeatUntil: "Répéter Jusqu'au (Optionnel)",
    repeatUntilDesc: "Si laissé vide, l'événement se répétera indéfiniment.",
    cancel: "Annuler",
    creating: "Création de l'Événement...",
    create: "Créer un Événement",
    selectGroupPlaceholder: "Sélectionnez un groupe que vous pouvez gérer",
    loadingGroups: "Chargement des groupes...",
    loginToSelect: "Connectez-vous pour sélectionner un groupe.",
    noGroups: "Aucun groupe disponible (doit être admin/créateur).",
    error_mustBeAdmin: "Vous devez être administrateur ou créateur d'un groupe pour programmer des événements.",
    error_pleaseSelectGroup: "Veuillez sélectionner un groupe.",
    error_memberRequired: (name: string) => `Vous devez être membre de "${name}" pour créer un événement pour celui-ci.`,
    error_adminRequired: (name: string) => `Vous devez être administrateur ou créateur de "${name}" pour programmer des événements.`,
    error_groupNotFound: "Groupe sélectionné non trouvé. Impossible de créer l'événement.",
    error_nameRequired: "Le nom de l'événement est requis.",
    error_dateRequired: "La date de l'événement est requise.",
    error_datePast: "La date de l'événement ne peut pas être dans le passé.",
    error_interval: "L'intervalle doit être d'au moins 1.",
    error_weeklySelection: "Veuillez sélectionner au moins un jour de la semaine pour la récurrence hebdomadaire.",
    error_monthlySelection: "Veuillez entrer un jour du mois valide (1-31) pour la récurrence mensuelle.",
    error_endDate: "La date de fin de la récurrence ne peut pas être antérieure à la date de début de l'événement.",
    toast_loginRequired_title: "Connexion Requise",
    toast_loginRequired_desc: "Veuillez vous connecter pour créer un groupe.",
    toast_cannotCreate_title: "Impossible de Créer l'Événement",
    toast_groupDetailsMissing_title: "Erreur",
    toast_groupDetailsMissing_desc: "Les détails du groupe sélectionné sont manquants.",
    toast_membershipRequired_title: "Adhésion Requise",
    toast_membershipRequired_desc: (name: string) => `Vous n'êtes pas membre de "${name}".`,
    toast_permissionDenied_title: "Permission Refusée",
    toast_permissionDenied_desc: (name: string) => `Seuls les administrateurs ou le créateur peuvent programmer des événements pour "${name}".`,
    toast_eventCreated_title: "Événement Créé !",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `L'événement "${eventName}" pour le groupe "${groupName}" a été programmé. Vous avez été ajouté automatiquement comme participant.`,
    toast_error_title: "Erreur",
    toast_error_desc_server: "Échec de la création de l'événement sur le serveur.",
    toast_error_desc_unexpected: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    toast_error_desc_save: "Échec de la sauvegarde de l'événement.",
  },
  de: {
    pageTitle: "Neues Event erstellen",
    pageDescription: "Füllen Sie die folgenden Details aus, um ein neues Event zu planen.",
    loadingTitle: "Neues Event erstellen",
    loadingDescription: "Formular wird geladen...",
    loadingCard: "Lade Event-Formular...",
    eventDetails: "Event-Details",
    eventDetailsDesc: "Geben Sie Informationen zu dem Event an, das Sie erstellen möchten.",
    eventName: "Event-Name",
    eventNamePlaceholder: "z.B. Sommer-Grillfest",
    description: "Beschreibung",
    descriptionPlaceholder: "Erzählen Sie uns mehr über das Event...",
    date: "Datum",
    startDate: "Startdatum",
    time: "Uhrzeit",
    duration: "Dauer (in Stunden)",
    location: "Ort",
    locationPlaceholder: "z.B. Central Park oder Online",
    image: "Event-Bild (optional)",
    imagePreview: "Vorschau des ausgewählten Event-Bildes",
    imageSizeNote: (size: number) => `Bitte vermeiden Sie sehr große Bilder. Maximale Originalgröße: ${size}MB.`,
    group: "Gruppe",
    copyFromPast: "Von vergangenem Event kopieren (optional)",
    copyFromPastPlaceholder: "Wählen Sie ein vergangenes Event zum Kopieren aus",
    noPastEvents: "Keine vergangenen Events zum Kopieren vorhanden",
    recurring: "Dieses Event wiederkehrend machen?",
    frequency: "Frequenz",
    daily: "Täglich",
    weekly: "Wöchentlich",
    monthly: "Monatlich",
    repeatEvery: "Wiederholen alle",
    days: "Tag(e)",
    weeks: "Woche(n)",
    months: "Monat(e)",
    repeatOn: "Wiederholen am",
    dayOfMonth: "Tag des Monats",
    dayOfMonthPlaceholder: "z.B. 15",
    repeatUntil: "Wiederholen bis (optional)",
    repeatUntilDesc: "Wenn leer, wird das Event unbegrenzt wiederholt.",
    cancel: "Abbrechen",
    creating: "Event wird erstellt...",
    create: "Event erstellen",
    selectGroupPlaceholder: "Wählen Sie eine Gruppe, die Sie verwalten können",
    loadingGroups: "Gruppen werden geladen...",
    loginToSelect: "Einloggen, um eine Gruppe auszuwählen.",
    noGroups: "Keine Gruppen verfügbar (muss Admin/Ersteller sein).",
    error_mustBeAdmin: "Sie müssen Admin oder Ersteller einer Gruppe sein, um Events zu planen.",
    error_pleaseSelectGroup: "Bitte wählen Sie eine Gruppe aus.",
    error_memberRequired: (name: string) => `Sie müssen Mitglied von "${name}" sein, um ein Event dafür zu erstellen.`,
    error_adminRequired: (name: string) => `Sie müssen Admin oder Ersteller von "${name}" sein, um Events zu planen.`,
    error_groupNotFound: "Ausgewählte Gruppe nicht gefunden. Event kann nicht erstellt werden.",
    error_nameRequired: "Event-Name ist erforderlich.",
    error_dateRequired: "Event-Datum ist erforderlich.",
    error_datePast: "Das Event-Datum darf nicht in der Vergangenheit liegen.",
    error_interval: "Das Intervall muss mindestens 1 sein.",
    error_weeklySelection: "Bitte wählen Sie für die wöchentliche Wiederholung mindestens einen Wochentag aus.",
    error_monthlySelection: "Bitte geben Sie einen gültigen Tag des Monats (1-31) für die monatliche Wiederholung ein.",
    error_endDate: "Das Enddatum der Wiederholung darf nicht vor dem Startdatum des Events liegen.",
    toast_loginRequired_title: "Anmeldung erforderlich",
    toast_loginRequired_desc: "Bitte melden Sie sich an, um eine Gruppe zu erstellen.",
    toast_cannotCreate_title: "Event kann nicht erstellt werden",
    toast_groupDetailsMissing_title: "Fehler",
    toast_groupDetailsMissing_desc: "Details der ausgewählten Gruppe fehlen.",
    toast_membershipRequired_title: "Mitgliedschaft erforderlich",
    toast_membershipRequired_desc: (name: string) => `Sie sind kein Mitglied von "${name}".`,
    toast_permissionDenied_title: "Berechtigung verweigert",
    toast_permissionDenied_desc: (name: string) => `Nur Admins oder der Ersteller können Events für "${name}" planen.`,
    toast_eventCreated_title: "Event erstellt!",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `Das Event "${eventName}" für die Gruppe "${groupName}" wurde geplant. Sie wurden automatisch als Teilnehmer hinzugefügt.`,
    toast_error_title: "Fehler",
    toast_error_desc_server: "Event konnte auf dem Server nicht erstellt werden.",
    toast_error_desc_unexpected: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    toast_error_desc_save: "Event konnte nicht gespeichert werden.",
  },
  it: {
    pageTitle: "Crea Nuovo Evento",
    pageDescription: "Compila i dettagli qui sotto per pianificare un nuovo evento.",
    loadingTitle: "Crea Nuovo Evento",
    loadingDescription: "Caricamento modulo...",
    loadingCard: "Caricamento Modulo Evento...",
    eventDetails: "Dettagli Evento",
    eventDetailsDesc: "Fornisci informazioni sull'evento che vuoi creare.",
    eventName: "Nome Evento",
    eventNamePlaceholder: "es., Grigliata Estiva",
    description: "Descrizione",
    descriptionPlaceholder: "Raccontaci di più sull'evento...",
    date: "Data",
    startDate: "Data di Inizio",
    time: "Ora",
    duration: "Durata (in ore)",
    location: "Luogo",
    locationPlaceholder: "es., Parco Centrale o Online",
    image: "Immagine Evento (Opzionale)",
    imagePreview: "Anteprima immagine evento selezionata",
    imageSizeNote: (size: number) => `Evita immagini molto grandi. Dimensione massima file: ${size}MB.`,
    group: "Gruppo",
    copyFromPast: "Copia da evento passato (opzionale)",
    copyFromPastPlaceholder: "Seleziona un evento passato da cui copiare",
    noPastEvents: "Nessun evento passato da cui copiare",
    recurring: "Rendere questo evento ricorrente?",
    frequency: "Frequenza",
    daily: "Giornaliera",
    weekly: "Settimanale",
    monthly: "Mensile",
    repeatEvery: "Ripeti ogni",
    days: "giorno/i",
    weeks: "settimana/e",
    months: "mese/i",
    repeatOn: "Ripeti il",
    dayOfMonth: "Giorno del Mese",
    dayOfMonthPlaceholder: "es., 15",
    repeatUntil: "Ripeti Fino a (Opzionale)",
    repeatUntilDesc: "Se lasciato vuoto, l'evento si ripeterà all'infinito.",
    cancel: "Annulla",
    creating: "Creazione Evento...",
    create: "Crea Evento",
    selectGroupPlaceholder: "Seleziona un gruppo che puoi gestire",
    loadingGroups: "Caricamento gruppi...",
    loginToSelect: "Accedi per selezionare un gruppo.",
    noGroups: "Nessun gruppo disponibile (devi essere admin/creatore).",
    error_mustBeAdmin: "Devi essere un amministratore o creatore di un gruppo per pianificare eventi.",
    error_pleaseSelectGroup: "Seleziona un gruppo.",
    error_memberRequired: (name: string) => `Devi essere un membro di "${name}" per creare un evento.`,
    error_adminRequired: (name: string) => `Devi essere un amministratore o creatore di "${name}" per pianificare eventi.`,
    error_groupNotFound: "Gruppo selezionato non trovato. Impossibile creare l'evento.",
    error_nameRequired: "Il nome dell'evento è obbligatorio.",
    error_dateRequired: "La data dell'evento è obbligatoria.",
    error_datePast: "La data dell'evento non può essere nel passato.",
    error_interval: "L'intervallo deve essere almeno 1.",
    error_weeklySelection: "Seleziona almeno un giorno della settimana per la ricorrenza settimanale.",
    error_monthlySelection: "Inserisci un giorno del mese valido (1-31) per la ricorrenza mensile.",
    error_endDate: "La data di fine ricorrenza non può essere precedente alla data di inizio.",
    toast_loginRequired_title: "Login Richiesto",
    toast_loginRequired_desc: "Effettua il login per creare un gruppo.",
    toast_cannotCreate_title: "Impossibile Creare l'Evento",
    toast_groupDetailsMissing_title: "Errore",
    toast_groupDetailsMissing_desc: "Mancano i dettagli del gruppo selezionato.",
    toast_membershipRequired_title: "Iscrizione Richiesta",
    toast_membershipRequired_desc: (name: string) => `Non sei un membro di "${name}".`,
    toast_permissionDenied_title: "Permesso Negato",
    toast_permissionDenied_desc: (name: string) => `Solo gli amministratori o il creatore possono pianificare eventi per "${name}".`,
    toast_eventCreated_title: "Evento Creato!",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `L'evento "${eventName}" per il gruppo "${groupName}" è stato pianificato. Sei stato aggiunto automaticamente come partecipante.`,
    toast_error_title: "Errore",
    toast_error_desc_server: "Impossibile creare l'evento sul server.",
    toast_error_desc_unexpected: "Si è verificato un errore imprevisto. Riprova.",
    toast_error_desc_save: "Impossibile salvare l'evento."
  },
  ru: {
    pageTitle: "Создать новое событие",
    pageDescription: "Заполните детали ниже, чтобы запланировать новое событие.",
    loadingTitle: "Создать новое событие",
    loadingDescription: "Загрузка формы...",
    loadingCard: "Загрузка формы события...",
    eventDetails: "Детали события",
    eventDetailsDesc: "Предоставьте информацию о событии, которое вы хотите создать.",
    eventName: "Название события",
    eventNamePlaceholder: "например, Летний барбекю-фестиваль",
    description: "Описание",
    descriptionPlaceholder: "Расскажите нам больше о событии...",
    date: "Дата",
    startDate: "Дата начала",
    time: "Время",
    duration: "Продолжительность (в часах)",
    location: "Местоположение",
    locationPlaceholder: "например, Центральный парк или Онлайн",
    image: "Изображение события (необязательно)",
    imagePreview: "Предпросмотр выбранного изображения события",
    imageSizeNote: (size: number) => `Пожалуйста, избегайте очень больших изображений. Максимальный исходный размер: ${size}МБ.`,
    group: "Группа",
    copyFromPast: "Копировать из прошлого события (необязательно)",
    copyFromPastPlaceholder: "Выберите прошлое событие для копирования",
    noPastEvents: "Нет прошлых событий для копирования",
    recurring: "Сделать это событие повторяющимся?",
    frequency: "Частота",
    daily: "Ежедневно",
    weekly: "Еженедельно",
    monthly: "Ежемесячно",
    repeatEvery: "Повторять каждые",
    days: "день(дней)",
    weeks: "неделю(недель)",
    months: "месяц(ев)",
    repeatOn: "Повторять по",
    dayOfMonth: "День месяца",
    dayOfMonthPlaceholder: "например, 15",
    repeatUntil: "Повторять до (необязательно)",
    repeatUntilDesc: "Если оставить пустым, событие будет повторяться бесконечно.",
    cancel: "Отмена",
    creating: "Создание события...",
    create: "Создать событие",
    selectGroupPlaceholder: "Выберите группу, которой вы можете управлять",
    loadingGroups: "Загрузка групп...",
    loginToSelect: "Войдите, чтобы выбрать группу.",
    noGroups: "Нет доступных групп (нужны права администратора/создателя).",
    error_mustBeAdmin: "Вы должны быть администратором или создателем группы, чтобы планировать события.",
    error_pleaseSelectGroup: "Пожалуйста, выберите группу.",
    error_memberRequired: (name: string) => `Вы должны быть участником группы "${name}", чтобы создать для нее событие.`,
    error_adminRequired: (name: string) => `Вы должны быть администратором или создателем группы "${name}", чтобы планировать события.`,
    error_groupNotFound: "Выбранная группа не найдена. Невозможно создать событие.",
    error_nameRequired: "Название события обязательно.",
    error_dateRequired: "Дата события обязательна.",
    error_datePast: "Дата события не может быть в прошлом.",
    error_interval: "Интервал должен быть не менее 1.",
    error_weeklySelection: "Пожалуйста, выберите хотя бы один день недели для еженедельного повторения.",
    error_monthlySelection: "Пожалуйста, введите действительный день месяца (1-31) для ежемесячного повторения.",
    error_endDate: "Дата окончания повторения не может быть раньше даты начала события.",
    toast_loginRequired_title: "Требуется вход",
    toast_loginRequired_desc: "Пожалуйста, войдите, чтобы создать группу.",
    toast_cannotCreate_title: "Не удается создать событие",
    toast_groupDetailsMissing_title: "Ошибка",
    toast_groupDetailsMissing_desc: "Отсутствуют детали выбранной группы.",
    toast_membershipRequired_title: "Требуется членство",
    toast_membershipRequired_desc: (name: string) => `Вы не являетесь участником группы "${name}".`,
    toast_permissionDenied_title: "Доступ запрещен",
    toast_permissionDenied_desc: (name: string) => `Только администраторы или создатель могут планировать события для группы "${name}".`,
    toast_eventCreated_title: "Событие создано!",
    toast_eventCreated_desc: (eventName: string, groupName: string) => `Событие "${eventName}" для группы "${groupName}" было запланировано. Вы были автоматически добавлены в качестве участника.`,
    toast_error_title: "Ошибка",
    toast_error_desc_server: "Не удалось создать событие на сервере.",
    toast_error_desc_unexpected: "Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз.",
    toast_error_desc_save: "Не удалось сохранить событие.",
  }
};


function CreateEventForm() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { currentUser, loading: authLoading } = useAuth();

  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventDurationHours, setEventDurationHours] = useState<number | undefined>(undefined);
  const [eventLocation, setEventLocation] = useState("");
  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [selectedGroupId, setSelectedGroupId] = useState<string | undefined>(undefined);
  const [contextualGroupName, setContextualGroupName] = useState<string | null>(null);
  const [isContextualGroup, setIsContextualGroup] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [availableGroupsForDropdown, setAvailableGroupsForDropdown] = useState<StoredGroup[]>([]);
  const [allLoadedGroups, setAllLoadedGroups] = useState<StoredGroup[]>([]);
  const [canCreateEventForSelectedGroup, setCanCreateEventForSelectedGroup] = useState(false);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);

  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | undefined>(undefined);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [pastEventsForGroup, setPastEventsForGroup] = useState<EventListItem[]>([]);
  const [isLoadingPastEvents, setIsLoadingPastEvents] = useState(false);
  
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
    if (authLoading) return;
    if (!currentUser) {
        const redirectUrl = `/login?redirect=/events/create?${searchParams.toString()}`;
        router.replace(redirectUrl);
        return;
    }

    setIsLoadingGroups(true);

    const queryGroupId = searchParams.get("groupId");
    const queryGroupName = searchParams.get("groupName");

    if (queryGroupId) {
      setSelectedGroupId(queryGroupId);
      setContextualGroupName(queryGroupName || `Group ID: ${queryGroupId}`);
      setIsContextualGroup(true);
    }

    async function loadGroups() {
        try {
            const loadedGroups = await getAllGroups();
            setAllLoadedGroups(loadedGroups);

            if (queryGroupId && !queryGroupName) {
                const found = loadedGroups.find(g => g.id === queryGroupId);
                if (found) setContextualGroupName(found.name);
            }

            if (currentUser && !isContextualGroup) {
                const memberGroups = loadedGroups.filter(group =>
                    (Array.isArray(group.memberIds) && group.memberIds.includes(currentUser.uid)) &&
                    ( (Array.isArray(group.adminIds) && group.adminIds.includes(currentUser.uid)) || group.creatorId === currentUser.uid )
                );
                setAvailableGroupsForDropdown(memberGroups);
            } else if (!currentUser && !isContextualGroup) {
                setAvailableGroupsForDropdown([]);
            }
            setIsLoadingGroups(false);
        } catch (error) {
            setAvailableGroupsForDropdown([]);
            setAllLoadedGroups([]);
            setIsLoadingGroups(false);
            toast({ title: t.toast_error_title, description: "Could not load groups for event creation.", variant: "destructive" });
        }
    }

    loadGroups();

  }, [searchParams, currentUser, authLoading, isContextualGroup, toast, t, router]);

  const fetchPastEvents = useCallback(async (groupId: string) => {
      setIsLoadingPastEvents(true);
      setPastEventsForGroup([]);
      try {
          const masterEventsForGroup = await S_getEventsForGroup(groupId);
          let groupPastEventsRaw: FullEventData[] = [];
          const today = startOfDay(new Date());
          const rangeStart = subMonths(today, 12);

          masterEventsForGroup.forEach(masterEvent => {
              if (masterEvent.isRecurring && masterEvent.recurrence && !masterEvent.isInstance) {
                  const instances = generateEventOccurrences(masterEvent, rangeStart, today); // Only need past events
                  instances.forEach(instance => {
                      if (isEventInstancePast(instance.date) && !instance.isCancelled) {
                          groupPastEventsRaw.push(instance);
                      }
                  });
              } else if (!masterEvent.isInstance) {
                  if (isEventInstancePast(masterEvent.date) && !masterEvent.isCancelled) {
                      groupPastEventsRaw.push(masterEvent);
                  }
              }
          });
          
          const sortedPastEvents = groupPastEventsRaw
            .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .map(e => ({ ...e, id: e.id || `event-${Math.random()}`}));

          setPastEventsForGroup(sortedPastEvents);

      } catch (error) {
          console.error("Failed to fetch past events", error);
      } finally {
          setIsLoadingPastEvents(false);
      }
  }, []);

  useEffect(() => {
    setFormError(null);
    if (currentUser && selectedGroupId && allLoadedGroups.length > 0) {
      const group = allLoadedGroups.find(g => g.id === selectedGroupId);
      if (group) {
        const isMember = group.memberIds?.includes(currentUser.uid) ?? false;
        const isAdminOrCreator = (group.adminIds?.includes(currentUser.uid) ?? false) || group.creatorId === currentUser.uid;

        if (!isMember) {
          setFormError(t.error_memberRequired(group.name));
          setCanCreateEventForSelectedGroup(false);
        } else if (!isAdminOrCreator) {
          setFormError(t.error_adminRequired(group.name));
          setCanCreateEventForSelectedGroup(false);
        } else {
          setFormError(null);
          setCanCreateEventForSelectedGroup(true);
          fetchPastEvents(group.id);
        }
      } else {
        if (!isContextualGroup) setFormError(t.error_groupNotFound);
        setCanCreateEventForSelectedGroup(false);
      }
    } else {
      setCanCreateEventForSelectedGroup(false);
      if (!selectedGroupId && !isContextualGroup && currentUser && availableGroupsForDropdown.length === 0 && !isLoadingGroups) {
         setFormError(t.error_mustBeAdmin);
      } else if (!selectedGroupId && !isContextualGroup && currentUser && availableGroupsForDropdown.length > 0) {
          setFormError(t.error_pleaseSelectGroup);
      }
    }
  }, [currentUser, selectedGroupId, allLoadedGroups, isContextualGroup, availableGroupsForDropdown.length, isLoadingGroups, t, fetchPastEvents]);


  const handleGroupChange = (groupId: string) => {
    setSelectedGroupId(groupId);
  };
  
  const handleCopyEvent = (eventId: string) => {
    const eventToCopy = pastEventsForGroup.find(e => e.id === eventId);
    if (!eventToCopy) return;

    setEventName(eventToCopy.title);
    setEventDescription(eventToCopy.description || "");
    setEventTime(eventToCopy.time || "");
    setEventLocation(eventToCopy.location || "");
    setEventDurationHours(eventToCopy.duration ? eventToCopy.duration / 60 : undefined);
    setImagePreview(eventToCopy.image || null);
    setSelectedImageBase64(eventToCopy.image || null);

    setEventDate("");
    toast({ title: "Event Copied", description: `Details from "${eventToCopy.title}" have been filled in. Please set a new date.`});
  };

  const handleDayOfWeekChange = (dayId: number) => {
    setSelectedDaysOfWeek(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImageBase64(null);
      setImagePreview(null);
      setFormError(null);
      return;
    }

    if (file.size > MAX_ORIGINAL_IMAGE_SIZE_MB * 1024 * 1024) {
      setFormError(t.imageSizeNote(MAX_ORIGINAL_IMAGE_SIZE_MB));
      setSelectedImageBase64(null);
      setImagePreview(null);
      if(event.target) event.target.value = "";
      return;
    }

    setFormError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      setSelectedImageBase64(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.onerror = () => {
      setFormError("Failed to read the image file.");
      setSelectedImageBase64(null);
      setImagePreview(null);
    };
    reader.readAsDataURL(file);
  };


  const validateRecurrenceSettings = (): string | null => {
    if (!isRecurring) return null;
    if (recurrenceInterval < 1) return t.error_interval;
    if (recurrenceFrequency === 'weekly' && selectedDaysOfWeek.length === 0) {
      return t.error_weeklySelection;
    }
    if (recurrenceFrequency === 'monthly') {
      if (!recurrenceDayOfMonth || recurrenceDayOfMonth < 1 || recurrenceDayOfMonth > 31) {
        return t.error_monthlySelection;
      }
    }
    if (recurrenceEndDate && eventDate && recurrenceEndDate < eventDate) {
        return t.error_endDate;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (formError && !formError.startsWith("Could not save the event: Your browser's local storage is full")) {
        toast({ title: t.toast_cannotCreate_title, description: formError, variant: "destructive"});
        return;
    }
    setFormError(null);
    setIsSubmitting(true);

    if (!currentUser) {
      setFormError("You must be logged in to create an event.");
      toast({ title: t.toast_loginRequired_title, description: t.toast_loginRequired_desc, variant: "destructive" });
      setIsSubmitting(false); return;
    }

    if (!eventName.trim()) { setFormError(t.error_nameRequired); setIsSubmitting(false); return; }
    if (!eventDate) { setFormError(t.error_dateRequired); setIsSubmitting(false); return; }
    if (!selectedGroupId) { setFormError(t.error_pleaseSelectGroup); setIsSubmitting(false); return; }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedEventDate = new Date(eventDate + 'T00:00:00');
    if (selectedEventDate < today && !isRecurring) {
        setFormError(t.error_datePast);
        setIsSubmitting(false); return;
    }

    const targetGroup = allLoadedGroups.find(g => g.id === selectedGroupId);
    if (!targetGroup) {
        setFormError(t.error_groupNotFound);
        toast({ title: t.toast_groupDetailsMissing_title, description: t.toast_groupDetailsMissing_desc, variant: "destructive"});
        setIsSubmitting(false); return;
    }

    const isMember = targetGroup.memberIds.includes(currentUser.uid);
    const isAdminOrCreator = targetGroup.adminIds.includes(currentUser.uid) || targetGroup.creatorId === currentUser.uid;

    if (!isMember) {
        setFormError(t.error_memberRequired(targetGroup.name));
        toast({ title: t.toast_membershipRequired_title, description: t.toast_membershipRequired_desc(targetGroup.name), variant: "destructive"});
        setIsSubmitting(false); return;
    }
    if (!isAdminOrCreator) {
        setFormError(t.error_adminRequired(targetGroup.name));
        toast({ title: t.toast_permissionDenied_title, description: t.toast_permissionDenied_desc(targetGroup.name), variant: "destructive"});
        setIsSubmitting(false); return;
    }

    const recurrenceErrorValidation = validateRecurrenceSettings();
    if (recurrenceErrorValidation) {
      setFormError(recurrenceErrorValidation);
      setIsSubmitting(false); return;
    }

    let groupNameForEvent: string;
    if (isContextualGroup && contextualGroupName) {
      groupNameForEvent = contextualGroupName;
    } else {
      groupNameForEvent = targetGroup.name;
    }

    const finalImage = selectedImageBase64 || targetGroup.image || DEFAULT_EVENT_IMAGE;

    const eventDataForServer: Omit<FullEventData, 'id' | 'instanceAttendees' | 'instanceMetadata' | 'isCancelled'> = {
      name: eventName,
      description: eventDescription,
      date: eventDate,
      time: eventTime,
      duration: eventDurationHours ? Math.round(eventDurationHours * 60) : undefined,
      location: eventLocation,
      group: groupNameForEvent,
      groupId: selectedGroupId,
      image: finalImage,
      attendees: [currentUser.uid],
      creatorId: currentUser.uid,
      isRecurring: isRecurring,
    };

    if (isRecurring) {
      eventDataForServer.recurrence = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval,
        endDate: recurrenceEndDate || undefined,
      };
      if (recurrenceFrequency === 'weekly') {
        eventDataForServer.recurrence.daysOfWeek = selectedDaysOfWeek.sort((a,b) => a-b);
      }
      if (recurrenceFrequency === 'monthly' && recurrenceDayOfMonth) {
        eventDataForServer.recurrence.dayOfMonth = recurrenceDayOfMonth;
      }
    }

    try {
      const result = await createEvent(eventDataForServer as any); 

      if (result.success && result.event) {
        dispatchStorageUpdatedEvent();
        
        toast({
          title: t.toast_eventCreated_title,
          description: t.toast_eventCreated_desc(eventName, groupNameForEvent),
        });
        
        setEventName(""); setEventDescription(""); setEventDate(""); setEventTime("");
        setEventLocation(""); setSelectedImageBase64(null); setImagePreview(null);
        if (!isContextualGroup) setSelectedGroupId(undefined);
        setIsRecurring(false); setRecurrenceFrequency('weekly'); setRecurrenceInterval(1);
        setSelectedDaysOfWeek([]); setRecurrenceDayOfMonth(undefined); setRecurrenceEndDate(undefined);
        setFormError(null);

        router.push("/events");
      } else {
        setFormError(result.message || t.toast_error_desc_server);
        toast({ title: t.toast_error_title, description: result.message || t.toast_error_desc_server, variant: "destructive"});
      }

    } catch (error: any) {
        setFormError(t.toast_error_desc_unexpected);
        toast({ title: t.toast_error_title, description: t.toast_error_desc_save, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  if (authLoading || isLoadingGroups) {
      return (
          <PageShell title={t.loadingTitle} description={t.loadingDescription}>
              <Card className="w-full max-w-2xl mx-auto shadow-lg">
                  <CardHeader><CardTitle>{t.loadingCard}</CardTitle></CardHeader>
                  <CardContent className="flex items-center justify-center p-10">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </CardContent>
              </Card>
          </PageShell>
      );
  }

  return (
    <PageShell
      title={t.pageTitle}
      description={t.pageDescription}
    >
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="font-headline">{t.eventDetails}</CardTitle>
            <CardDescription>
              {t.eventDetailsDesc}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            <div className="space-y-2">
              <Label>{t.group}</Label>
                {isContextualGroup && contextualGroupName ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted"><Users className="h-5 w-5 text-muted-foreground" /><p className="text-sm">{contextualGroupName}</p></div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select onValueChange={handleGroupChange} value={selectedGroupId} disabled={!currentUser || (availableGroupsForDropdown.length === 0 && !isContextualGroup) || isLoadingGroups}>
                        <SelectTrigger id="eventGroup" className="w-full" aria-required="true"><SelectValue placeholder={t.selectGroupPlaceholder} /></SelectTrigger>
                        <SelectContent>
                        {isLoadingGroups ? (<SelectItem value="loading" disabled>{t.loadingGroups}</SelectItem>)
                        : !currentUser ? (<SelectItem value="no-user" disabled>{t.loginToSelect}</SelectItem>)
                        : availableGroupsForDropdown.length > 0 ? (availableGroupsForDropdown.map(group => (<SelectItem key={group.id} value={group.id}>{group.name}</SelectItem>)))
                        : (<SelectItem value="no-groups" disabled>{t.noGroups}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              {!isContextualGroup && !currentUser && !isLoadingGroups && <p className="text-xs text-muted-foreground mt-1">{t.loginToSelect}</p>}
              {!isContextualGroup && currentUser && availableGroupsForDropdown.length === 0 && !isLoadingGroups && <p className="text-xs text-muted-foreground mt-1">{t.error_mustBeAdmin}</p>}
            </div>

            {selectedGroupId && canCreateEventForSelectedGroup && (
                <div className="space-y-2">
                    <Label htmlFor="copyEvent">{t.copyFromPast}</Label>
                    <div className="flex items-center gap-2">
                        <Select onValueChange={handleCopyEvent} disabled={isLoadingPastEvents || pastEventsForGroup.length === 0}>
                            <SelectTrigger id="copyEvent" className="w-full"><SelectValue placeholder={t.copyFromPastPlaceholder} /></SelectTrigger>
                            <SelectContent>
                                {isLoadingPastEvents ? (
                                    <SelectItem value="loading" disabled>Loading past events...</SelectItem>
                                ) : pastEventsForGroup.length > 0 ? (
                                    pastEventsForGroup.map(event => (<SelectItem key={event.id} value={event.id}>{event.title} ({new Date(event.date + 'T00:00:00Z').toLocaleDateString('en-CA')})</SelectItem>))
                                ) : (
                                    <SelectItem value="no-events" disabled>{t.noPastEvents}</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                        <Copy className="h-5 w-5 text-muted-foreground" />
                    </div>
                </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="eventName">{t.eventName}</Label>
              <Input id="eventName" placeholder={t.eventNamePlaceholder} value={eventName} onChange={(e) => { setEventName(e.target.value); if (!formError?.includes("admin or creator") && !formError?.includes("member of this group")) setFormError(null); }} aria-required="true"/>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDescription">{t.description}</Label>
              <Textarea id="eventDescription" placeholder={t.descriptionPlaceholder} rows={4} value={eventDescription} onChange={(e) => setEventDescription(e.target.value)}/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">{isRecurring ? t.startDate : t.date}</Label>
                <div className="flex items-center gap-2"><Input id="eventDate" type="date" value={eventDate} onChange={(e) => { setEventDate(e.target.value); if (!formError?.includes("admin or creator") && !formError?.includes("member of this group")) setFormError(null); }} aria-required="true"/><CalendarIcon className="h-5 w-5 text-muted-foreground" /></div>
              </div>
              <div className="space-y-2"><Label htmlFor="eventTime">{t.time}</Label><Input id="eventTime" type="time" value={eventTime} onChange={(e) => setEventTime(e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDuration">{t.duration}</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="eventDuration" 
                    type="number" 
                    min="0" 
                    step="0.5" 
                    value={eventDurationHours || ''} 
                    onChange={(e) => setEventDurationHours(e.target.value ? parseFloat(e.target.value) : undefined)}
                  />
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="eventLocation">{t.location}</Label>
                <div className="flex items-center gap-2">
                  <Input 
                    id="eventLocation" 
                    placeholder={t.locationPlaceholder} 
                    value={eventLocation} 
                    onChange={(e) => setEventLocation(e.target.value)}
                  />
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventImageFile">{t.image}</Label>
              <div className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-muted-foreground" />
                <Input
                  id="eventImageFile"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="flex-1 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                />
              </div>
              
              {imagePreview && (
                <div className="mt-2 border rounded-md p-2 inline-block">
                  <div className="relative w-[200px] h-[133px]">
                    <Image
                      src={imagePreview}
                      alt={t.imagePreview}
                      width={200}
                      height={133}
                      style={{ objectFit: "cover" }}
                      className="rounded"
                      unoptimized={imagePreview.startsWith('data:image')}
                      data-ai-hint="event party"
                    />
                  </div>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t.imageSizeNote(MAX_ORIGINAL_IMAGE_SIZE_MB)}</p>
            </div>

            <div className="space-y-4 p-4 border rounded-md">
              <div className="flex items-center space-x-2">
                <Switch id="isRecurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                <Label htmlFor="isRecurring" className="flex items-center text-base font-semibold">
                  <RotateCcw className="mr-2 h-4 w-4" /> {t.recurring}
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-4 pl-2 mt-2 border-l-2 ml-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceFrequency">{t.frequency}</Label>
                      <Select value={recurrenceFrequency} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setRecurrenceFrequency(value)}>
                        <SelectTrigger id="recurrenceFrequency"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{t.daily}</SelectItem>
                          <SelectItem value="weekly">{t.weekly}</SelectItem>
                          <SelectItem value="monthly">{t.monthly}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceInterval">{t.repeatEvery}</Label>
                      <div className="flex items-center gap-2">
                        <Input id="recurrenceInterval" type="number" min="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)} className="w-20"/>
                        <span className="text-sm text-muted-foreground">
                          {recurrenceFrequency === 'daily' ? t.days : recurrenceFrequency === 'weekly' ? t.weeks : t.months}
                        </span>
                      </div>
                    </div>
                  </div>

                  {recurrenceFrequency === 'weekly' && (
                    <div className="space-y-2">
                      <Label>{t.repeatOn}</Label>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {DAYS_OF_WEEK.map(day => (
                          <div key={day.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`day-${day.id}`}
                              checked={selectedDaysOfWeek.includes(day.id)}
                              onCheckedChange={() => handleDayOfWeekChange(day.id)}
                            />
                            <Label htmlFor={`day-${day.id}`} className="font-normal">{day.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recurrenceFrequency === 'monthly' && (
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceDayOfMonth">{t.dayOfMonth}</Label>
                      <Input id="recurrenceDayOfMonth" type="number" min="1" max="31" placeholder={t.dayOfMonthPlaceholder} value={recurrenceDayOfMonth||""} onChange={(e) => setRecurrenceDayOfMonth(e.target.value?parseInt(e.target.value,10):undefined)}/>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="recurrenceEndDate">{t.repeatUntil}</Label>
                    <Input id="recurrenceEndDate" type="date" value={recurrenceEndDate || ""} onChange={(e) => setRecurrenceEndDate(e.target.value || undefined)}/>
                     <p className="text-xs text-muted-foreground">{t.repeatUntilDesc}</p>
                  </div>
                </div>
              )}
            </div>

            {formError && <p className="text-sm text-destructive flex items-center gap-1.5"><ShieldAlert className="h-4 w-4"/> {formError}</p>}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild type="button">
              <Link href={isContextualGroup && selectedGroupId ? `/groups/${selectedGroupId}` : "/events"}>{t.cancel}</Link>
            </Button>
            <Button type="submit" disabled={!currentUser || !canCreateEventForSelectedGroup || isSubmitting || isLoadingGroups}>
                {isSubmitting ? t.creating : t.create}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<PageShell title="Create New Event" description="Loading form..."><Card className="w-full max-w-2xl mx-auto shadow-lg p-10 text-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></Card></PageShell>}>
      <CreateEventForm />
    </Suspense>
  );
}
