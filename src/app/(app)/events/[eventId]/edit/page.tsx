
"use client";

import { PageShell } from "@/components/shared/PageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon, MapPin, Users, Info, AlertTriangle, Loader2, ArrowLeft, UploadCloud, RotateCcw, Clock } from "lucide-react";
import Link from "next/link";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import type { Event, RecurrenceRule, Group as StoredGroupInfo } from "@/types";
import Image from "next/image";
import { getMasterEventById, updateMasterEvent } from '@/actions/event-actions';
import { getGroupById } from '@/actions/group-actions';
import { dispatchStorageUpdatedEvent } from "@/hooks/useNotificationData";


const DEFAULT_EVENT_IMAGE = "https://placehold.co/600x400.png";
const DAYS_OF_WEEK = [
  { id: 1, label: "Mon" }, { id: 2, label: "Tue" }, { id: 3, label: "Wed" },
  { id: 4, label: "Thu" }, { id: 5, label: "Fri" }, { id: 6, label: "Sat" }, { id: 0, label: "Sun" }
];
const MAX_ORIGINAL_IMAGE_SIZE_MB = 2;

const translations = {
  en: {
    loadingTitle: "Loading Event Editor...",
    loadingDescription: "Please wait...",
    accessDeniedTitle: "Access Denied",
    accessDeniedDesc: "Cannot edit this event.",
    eventNotFound: "Event not found. It might have been moved or deleted.",
    permissionDenied: (name: string) => `You must be an admin/creator of "${name}" to edit this event.`,
    groupNotFound: "The group that hosts this event could not be found.",
    errorLoadingTitle: "Error Loading Event",
    errorLoadingDesc: "Could not load event data.",
    back: "Back",
    backToEvents: "Back to Events",
    editEventTitle: (name: string) => `Edit Event: ${name}`,
    editEventDesc: "Modify the details of your event.",
    eventDetails: "Event Details",
    updateInfo: "Update event information.",
    eventName: "Event Name",
    description: "Description",
    date: "Date",
    startDate: "Start Date",
    time: "Time",
    duration: "Duration (in hours)",
    location: "Location",
    image: "Event Image (Optional)",
    imagePreview: "Event image preview",
    imageSizeNote: (size: number) => `Please avoid very large images. Max original size: ${size}MB.`,
    group: "Group",
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
    repeatUntil: "Repeat Until (Optional)",
    repeatUntilDesc: "If blank, repeats indefinitely.",
    cancel: "Cancel",
    saving: "Saving...",
    saveChanges: "Save Changes",
    error_datePast: "Event date cannot be in the past for non-recurring events unless it's the original date.",
    error_interval: "Interval must be at least 1.",
    error_weeklySelection: "Please select at least one day of the week for weekly recurrence.",
    error_monthlySelection: "Please enter a valid day of the month (1-31) for monthly recurrence.",
    error_endDate: "Recurrence end date cannot be before the event start date.",
    toast_permissionDenied_title: "Permission Denied",
    toast_eventUpdated_title: "Event Updated!",
    toast_eventUpdated_desc: (name: string) => `Event "${name}" has been successfully updated.`,
    toast_error_title: "Error",
    toast_error_desc_server: "Failed to update event on the server.",
    toast_error_desc_unexpected: "An unexpected error occurred. Please try again.",
    toast_error_desc_save: "Failed to save event updates.",
  },
  es: {
    loadingTitle: "Cargando Editor de Eventos...",
    loadingDescription: "Por favor, espera.",
    accessDeniedTitle: "Acceso Denegado",
    accessDeniedDesc: "No se puede editar este evento.",
    eventNotFound: "Evento no encontrado. Puede que haya sido movido o eliminado.",
    permissionDenied: (name: string) => `Debes ser administrador/creador de "${name}" para editar este evento.`,
    groupNotFound: "No se pudo encontrar el grupo anfitrión de este evento.",
    errorLoadingTitle: "Error al Cargar el Evento",
    errorLoadingDesc: "No se pudieron cargar los datos del evento.",
    back: "Volver",
    backToEvents: "Volver a Eventos",
    editEventTitle: (name: string) => `Editar Evento: ${name}`,
    editEventDesc: "Modifica los detalles de tu evento.",
    eventDetails: "Detalles del Evento",
    updateInfo: "Actualiza la información del evento.",
    eventName: "Nombre del Evento",
    description: "Descripción",
    date: "Fecha",
    startDate: "Fecha de Inicio",
    time: "Hora",
    duration: "Duración (en horas)",
    location: "Ubicación",
    image: "Imagen del Evento (Opcional)",
    imagePreview: "Vista previa de la imagen del evento",
    imageSizeNote: (size: number) => `Por favor, evita imágenes muy grandes. Tamaño original máximo: ${size}MB.`,
    group: "Grupo",
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
    repeatUntil: "Repetir Hasta (Opcional)",
    repeatUntilDesc: "Si se deja en blanco, se repetirá indefinidamente.",
    cancel: "Cancelar",
    saving: "Guardando...",
    saveChanges: "Guardar Cambios",
    error_datePast: "La fecha del evento no puede ser en el pasado para eventos no recurrentes a menos que sea la fecha original.",
    error_interval: "El intervalo debe ser al menos 1.",
    error_weeklySelection: "Por favor, selecciona al menos un día de la semana para la recurrencia semanal.",
    error_monthlySelection: "Por favor, introduce un día del mes válido (1-31) para la recurrencia mensual.",
    error_endDate: "La fecha de finalización de la recurrencia no puede ser anterior a la fecha de inicio del evento.",
    toast_permissionDenied_title: "Permiso Denegado",
    toast_eventUpdated_title: "¡Evento Actualizado!",
    toast_eventUpdated_desc: (name: string) => `El evento "${name}" ha sido actualizado correctamente.`,
    toast_error_title: "Error",
    toast_error_desc_server: "Falló al actualizar el evento en el servidor.",
    toast_error_desc_unexpected: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
    toast_error_desc_save: "Falló al guardar las actualizaciones del evento.",
  },
  pt: {
    loadingTitle: "Carregando Editor de Eventos...",
    loadingDescription: "Por favor, aguarde.",
    accessDeniedTitle: "Acesso Negado",
    accessDeniedDesc: "Não é possível editar este evento.",
    eventNotFound: "Evento não encontrado. Pode ter sido movido ou excluído.",
    permissionDenied: (name: string) => `Você deve ser um administrador/criador de "${name}" para editar este evento.`,
    groupNotFound: "O grupo anfitrião deste evento não foi encontrado.",
    errorLoadingTitle: "Erro ao Carregar o Evento",
    errorLoadingDesc: "Não foi possível carregar os dados do evento.",
    back: "Voltar",
    backToEvents: "Voltar para Eventos",
    editEventTitle: (name: string) => `Editar Evento: ${name}`,
    editEventDesc: "Modifique os detalhes do seu evento.",
    eventDetails: "Detalhes do Evento",
    updateInfo: "Atualize as informações do evento.",
    eventName: "Nome do Evento",
    description: "Descrição",
    date: "Data",
    startDate: "Data de Início",
    time: "Hora",
    duration: "Duração (em horas)",
    location: "Local",
    image: "Imagem do Evento (Opcional)",
    imagePreview: "Pré-visualização da imagem do evento",
    imageSizeNote: (size: number) => `Por favor, evite imagens muito grandes. Tamanho original máximo: ${size}MB.`,
    group: "Grupo",
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
    repeatUntil: "Repetir Até (Opcional)",
    repeatUntilDesc: "Se deixado em branco, repetirá indefinidamente.",
    cancel: "Cancelar",
    saving: "Salvando...",
    saveChanges: "Salvar Alterações",
    error_datePast: "A data do evento não pode ser no passado para eventos não recorrentes, a menos que seja a data original.",
    error_interval: "O intervalo deve ser de pelo menos 1.",
    error_weeklySelection: "Por favor, selecione pelo menos um dia da semana para la recorrência semanal.",
    error_monthlySelection: "Por favor, insira um dia do mês válido (1-31) para a recorrência mensal.",
    error_endDate: "A data de término da recorrência não pode ser anterior à data de início do evento.",
    toast_permissionDenied_title: "Permissão Negada",
    toast_eventUpdated_title: "Evento Atualizado!",
    toast_eventUpdated_desc: (name: string) => `O evento "${name}" foi atualizado com sucesso.`,
    toast_error_title: "Erro",
    toast_error_desc_server: "Falha ao atualizar o evento no servidor.",
    toast_error_desc_unexpected: "Ocorreu um erro inesperado. Por favor, tente novamente.",
    toast_error_desc_save: "Falha ao salvar as atualizações do evento.",
  },
  fr: {
    loadingTitle: "Chargement de l'Éditeur d'Événement...",
    loadingDescription: "Veuillez patienter...",
    accessDeniedTitle: "Accès Refusé",
    accessDeniedDesc: "Impossible de modifier cet événement.",
    eventNotFound: "Événement non trouvé. Il a peut-être été déplacé ou supprimé.",
    permissionDenied: (name) => `Vous devez être administrateur/créateur de "${name}" pour modifier cet événement.`,
    groupNotFound: "Le groupe qui héberge cet événement n'a pas pu être trouvé.",
    errorLoadingTitle: "Erreur lors du Chargement de l'Événement",
    errorLoadingDesc: "Impossible de charger les données de l'événement.",
    back: "Retour",
    backToEvents: "Retour aux Événements",
    editEventTitle: (name) => `Modifier l'Événement : ${name}`,
    editEventDesc: "Modifiez les détails de votre événement.",
    eventDetails: "Détails de l'Événement",
    updateInfo: "Mettez à jour les informations de l'événement.",
    eventName: "Nom de l'Événement",
    description: "Description",
    date: "Date",
    startDate: "Date de Début",
    time: "Heure",
    duration: "Durée (en heures)",
    location: "Lieu",
    image: "Image de l'Événement (Optionnel)",
    imagePreview: "Aperçu de l'image de l'événement",
    imageSizeNote: (size) => `Veuillez éviter les images très volumineuses. Taille originale maximale : ${size}Mo.`,
    group: "Groupe",
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
    repeatUntil: "Répéter Jusqu'au (Optionnel)",
    repeatUntilDesc: "Si laissé vide, se répète indéfiniment.",
    cancel: "Annuler",
    saving: "Enregistrement...",
    saveChanges: "Enregistrer les Modifications",
    error_datePast: "La date de l'événement ne peut pas être dans le passé pour les événements non récurrents, sauf s'il s'agit de la date d'origine.",
    error_interval: "L'intervalle doit être d'au moins 1.",
    error_weeklySelection: "Veuillez sélectionner au moins un jour de la semaine pour la récurrence hebdomadaire.",
    error_monthlySelection: "Veuillez entrer un jour du mois valide (1-31) pour la récurrence mensuelle.",
    error_endDate: "La date de fin de la récurrence ne peut pas être antérieure à la date de début de l'événement.",
    toast_permissionDenied_title: "Permission Refusée",
    toast_eventUpdated_title: "Événement Mis à Jour !",
    toast_eventUpdated_desc: (name) => `L'événement "${name}" a été mis à jour avec succès.`,
    toast_error_title: "Erreur",
    toast_error_desc_server: "Échec de la mise à jour de l'événement sur le serveur.",
    toast_error_desc_unexpected: "Une erreur inattendue s'est produite. Veuillez réessayer.",
    toast_error_desc_save: "Échec de l'enregistrement des mises à jour de l'événement.",
  },
  de: {
    loadingTitle: "Event-Editor wird geladen...",
    loadingDescription: "Bitte warten...",
    accessDeniedTitle: "Zugriff verweigert",
    accessDeniedDesc: "Dieses Ereignis kann nicht bearbeitet werden.",
    eventNotFound: "Ereignis nicht gefunden. Es wurde möglicherweise verschoben oder gelöscht.",
    permissionDenied: (name: string) => `Sie müssen Admin/Ersteller von "${name}" sein, um dieses Ereignis zu bearbeiten.`,
    groupNotFound: "Die Gruppe, die dieses Ereignis veranstaltet, konnte nicht gefunden werden.",
    errorLoadingTitle: "Fehler beim Laden des Events",
    errorLoadingDesc: "Ereignisdaten konnten nicht geladen werden.",
    back: "Zurück",
    backToEvents: "Zurück zu den Events",
    editEventTitle: (name: string) => `Ereignis bearbeiten: ${name}`,
    editEventDesc: "Ändern Sie die Details Ihres Events.",
    eventDetails: "Event-Details",
    updateInfo: "Aktualisieren Sie die Event-Informationen.",
    eventName: "Event-Name",
    description: "Beschreibung",
    date: "Datum",
    startDate: "Startdatum",
    time: "Uhrzeit",
    duration: "Dauer (in Stunden)",
    location: "Ort",
    image: "Event-Bild (Optional)",
    imagePreview: "Vorschau des Event-Bildes",
    imageSizeNote: (size: number) => `Bitte vermeiden Sie sehr große Bilder. Maximale Originalgröße: ${size}MB.`,
    group: "Gruppe",
    recurring: "Dieses Ereignis zu einem wiederkehrenden Ereignis machen?",
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
    repeatUntil: "Wiederholen bis (Optional)",
    repeatUntilDesc: "Wenn leer, wird es unendlich wiederholt.",
    cancel: "Abbrechen",
    saving: "Speichern...",
    saveChanges: "Änderungen speichern",
    error_datePast: "Das Ereignisdatum kann für nicht wiederkehrende Ereignisse nicht in der Vergangenheit liegen, es sei denn, es ist das ursprüngliche Datum.",
    error_interval: "Das Intervall muss mindestens 1 sein.",
    error_weeklySelection: "Bitte wählen Sie mindestens einen Wochentag für die wöchentliche Wiederholung aus.",
    error_monthlySelection: "Bitte geben Sie einen gültigen Tag des Monats (1-31) für die monatliche Wiederholung ein.",
    error_endDate: "Das Enddatum der Wiederholung darf nicht vor dem Startdatum des Ereignisses liegen.",
    toast_permissionDenied_title: "Zugriff verweigert",
    toast_eventUpdated_title: "Ereignis aktualisiert!",
    toast_eventUpdated_desc: (name: string) => `Ereignis "${name}" wurde erfolgreich aktualisiert.`,
    toast_error_title: "Fehler",
    toast_error_desc_server: "Ereignis auf dem Server konnte nicht aktualisiert werden.",
    toast_error_desc_unexpected: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
    toast_error_desc_save: "Fehler beim Speichern der Event-Aktualisierungen."
  },
  it: {
    loadingTitle: "Caricamento Editor Eventi...",
    loadingDescription: "Attendere prego...",
    accessDeniedTitle: "Accesso Negato",
    accessDeniedDesc: "Impossibile modificare questo evento.",
    eventNotFound: "Evento non trovato. Potrebbe essere stato spostato o eliminato.",
    permissionDenied: (name: string) => `Devi essere un amministratore/creatore di "${name}" per modificare questo evento.`,
    groupNotFound: "Il gruppo che ospita questo evento non è stato trovato.",
    errorLoadingTitle: "Errore nel Caricamento dell'Evento",
    errorLoadingDesc: "Impossibile caricare i dati dell'evento.",
    back: "Indietro",
    backToEvents: "Torna agli Eventi",
    editEventTitle: (name: string) => `Modifica Evento: ${name}`,
    editEventDesc: "Modifica i dettagli del tuo evento.",
    eventDetails: "Dettagli Evento",
    updateInfo: "Aggiorna le informazioni sull'evento.",
    eventName: "Nome Evento",
    description: "Descrizione",
    date: "Data",
    startDate: "Data di Inizio",
    time: "Ora",
    duration: "Durata (in ore)",
    location: "Luogo",
    image: "Immagine Evento (Opzionale)",
    imagePreview: "Anteprima immagine evento",
    imageSizeNote: (size: number) => `Si prega di evitare immagini molto grandi. Dimensione massima originale: ${size}MB.`,
    group: "Gruppo",
    recurring: "Rendere questo un evento ricorrente?",
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
    repeatUntil: "Ripeti Fino a (Opzionale)",
    repeatUntilDesc: "Se lasciato vuoto, si ripeterà all'infinito.",
    cancel: "Annulla",
    saving: "Salvataggio...",
    saveChanges: "Salva Modifiche",
    error_datePast: "La data dell'evento non può essere nel passato per eventi non ricorrenti a meno che non sia la data originale.",
    error_interval: "L'intervallo deve essere almeno 1.",
    error_weeklySelection: "Seleziona almeno un giorno della settimana per la ricorrenza settimanale.",
    error_monthlySelection: "Inserisci un giorno del mese valido (1-31) per la ricorrenza mensile.",
    error_endDate: "La data di fine della ricorrenza non può essere precedente alla data di inizio dell'evento.",
    toast_permissionDenied_title: "Permesso Negato",
    toast_eventUpdated_title: "Evento Aggiornato!",
    toast_eventUpdated_desc: (name: string) => `L'evento "${name}" è stato aggiornato con successo.`,
    toast_error_title: "Errore",
    toast_error_desc_server: "Impossibile aggiornare l'evento sul server.",
    toast_error_desc_unexpected: "Si è verificato un errore imprevisto. Riprova.",
    toast_error_desc_save: "Impossibile salvare gli aggiornamenti dell'evento."
  },
  ru: {
    loadingTitle: "Загрузка редактора событий...",
    loadingDescription: "Пожалуйста, подождите...",
    accessDeniedTitle: "Доступ запрещен",
    accessDeniedDesc: "Невозможно отредактировать это событие.",
    eventNotFound: "Событие не найдено. Возможно, оно было перемещено или удалено.",
    permissionDenied: (name: string) => `Вы должны быть администратором/создателем группы "${name}", чтобы редактировать это событие.`,
    groupNotFound: "Группа, в которой проводится это событие, не найдена.",
    errorLoadingTitle: "Ошибка загрузки события",
    errorLoadingDesc: "Не удалось загрузить данные о событии.",
    back: "Назад",
    backToEvents: "Назад к событиям",
    editEventTitle: (name: string) => `Редактировать событие: ${name}`,
    editEventDesc: "Измените детали вашего события.",
    eventDetails: "Детали события",
    updateInfo: "Обновите информацию о событии.",
    eventName: "Название события",
    description: "Описание",
    date: "Дата",
    startDate: "Дата начала",
    time: "Время",
    duration: "Продолжительность (в часах)",
    location: "Местоположение",
    image: "Изображение события (необязательно)",
    imagePreview: "Предпросмотр изображения события",
    imageSizeNote: (size: number) => `Пожалуйста, избегайте очень больших изображений. Максимальный исходный размер: ${size} МБ.`,
    group: "Группа",
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
    repeatUntil: "Повторять до (необязательно)",
    repeatUntilDesc: "Если оставить пустым, будет повторяться бесконечно.",
    cancel: "Отмена",
    saving: "Сохранение...",
    saveChanges: "Сохранить изменения",
    error_datePast: "Дата события не может быть в прошлом для неповторяющихся событий, если это не исходная дата.",
    error_interval: "Интервал должен быть не менее 1.",
    error_weeklySelection: "Пожалуйста, выберите хотя бы один день недели для еженедельного повторения.",
    error_monthlySelection: "Пожалуйста, введите действительный день месяца (1-31) для ежемесячного повторения.",
    error_endDate: "Дата окончания повторения не может быть раньше даты начала события.",
    toast_permissionDenied_title: "Доступ запрещен",
    toast_eventUpdated_title: "Событие обновлено!",
    toast_eventUpdated_desc: (name: string) => `Событие "${name}" успешно обновлено.`,
    toast_error_title: "Ошибка",
    toast_error_desc_server: "Не удалось обновить событие на сервере.",
    toast_error_desc_unexpected: "Произошла непредвиденная ошибка. Пожалуйста, попробуйте еще раз.",
    toast_error_desc_save: "Не удалось сохранить обновления события.",
  }
};


function EditEventForm() {
  const router = useRouter();
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId; 
  const { toast } = useToast();
  const { currentUser, loading: authLoading } = useAuth();

  const [currentMasterEvent, setCurrentMasterEvent] = useState<Event | null>(null);
  const [hostingGroup, setHostingGroup] = useState<StoredGroupInfo | null>(null);

  const [eventName, setEventName] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventDurationHours, setEventDurationHours] = useState<number | undefined>(undefined);
  const [eventLocation, setEventLocation] = useState("");

  const [selectedImageBase64, setSelectedImageBase64] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);


  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [selectedDaysOfWeek, setSelectedDaysOfWeek] = useState<number[]>([]);
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState<number | undefined>(undefined);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<string | undefined>(undefined);

  const [lang, setLang] = useState<'en' | 'es' | 'pt' | 'fr' | 'de' | 'it' | 'ru'>('en');

  useEffect(() => {
    if (typeof window !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split('-')[0];
      if (browserLang === 'es') setLang('es');
      else if (browserLang === 'pt') setLang('pt');
      else if (browserLang === 'fr') setLang('fr');
      else if (browserLang === 'de') setLang('de');
      else if (browserLang === 'it') setLang('it');
      else if (browserLang === 'ru') setLang('ru');
    }
  }, []);

  const t = translations[lang];

  useEffect(() => {
    if (!eventId || authLoading) {
      setIsLoading(authLoading);
      return;
    }
    if (!currentUser && !authLoading) {
        router.replace(`/login?redirect=/events/${eventId}/edit`);
        return;
    }

    setIsLoading(true);
    setFormError(null);
    setAccessDeniedError(null);

    async function loadEventForEditing() {
      const masterEventId = eventId.includes("_") ? eventId.split("_")[0] : eventId;
      const eventToEdit = await getMasterEventById(masterEventId);

      if (!eventToEdit) {
        setAccessDeniedError(t.eventNotFound);
        setIsLoading(false);
        return;
      }
      
      eventToEdit.attendees = Array.isArray(eventToEdit.attendees) ? eventToEdit.attendees : [];
      eventToEdit.isCancelled = typeof eventToEdit.isCancelled === 'boolean' ? eventToEdit.isCancelled : false;
      eventToEdit.instanceAttendees = eventToEdit.instanceAttendees || {};
      eventToEdit.instanceMetadata = eventToEdit.instanceMetadata || {};
      
      const initialImage = eventToEdit.image || DEFAULT_EVENT_IMAGE;

      setCurrentMasterEvent(eventToEdit);
      setImagePreview(initialImage);

      const groupForEvent = await getGroupById(eventToEdit.groupId);
      if (!groupForEvent) {
          setAccessDeniedError(t.groupNotFound);
          setCurrentMasterEvent(null); setIsLoading(false); return;
      }
      setHostingGroup(groupForEvent);

      if (!currentUser || (!groupForEvent.adminIds.includes(currentUser.uid) && groupForEvent.creatorId !== currentUser.uid)) {
        setAccessDeniedError(t.permissionDenied(groupForEvent.name));
        setCurrentMasterEvent(null); setIsLoading(false); return;
      }

      setEventName(eventToEdit.name);
      setEventDescription(eventToEdit.description || "");
      setEventDate(eventToEdit.date);
      setEventTime(eventToEdit.time || "");
      setEventDurationHours(eventToEdit.duration ? eventToEdit.duration / 60 : undefined);
      setEventLocation(eventToEdit.location || "");
      setSelectedImageBase64(null); 

      setIsRecurring(eventToEdit.isRecurring || false);
      if (eventToEdit.isRecurring && eventToEdit.recurrence) {
        const rec = eventToEdit.recurrence;
        setRecurrenceFrequency(rec.frequency);
        setRecurrenceInterval(rec.interval);
        setSelectedDaysOfWeek(rec.daysOfWeek || []);
        setRecurrenceDayOfMonth(rec.dayOfMonth);
        setRecurrenceEndDate(rec.endDate);
      } else {
        setRecurrenceFrequency('weekly');
        setRecurrenceInterval(1);
        setSelectedDaysOfWeek([]);
        setRecurrenceDayOfMonth(undefined);
        setRecurrenceEndDate(undefined);
      }
      setIsLoading(false);
    }
    loadEventForEditing().catch(error => {
      setAccessDeniedError(t.errorLoadingDesc);
      setIsLoading(false);
    });

  }, [eventId, currentUser, authLoading, t, router]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSelectedImageBase64(null);
      setImagePreview(currentMasterEvent?.image || DEFAULT_EVENT_IMAGE);
      setFormError(null);
      return;
    }

    if (file.size > MAX_ORIGINAL_IMAGE_SIZE_MB * 1024 * 1024) { 
      setFormError(t.imageSizeNote(MAX_ORIGINAL_IMAGE_SIZE_MB));
      setSelectedImageBase64(null);
      setImagePreview(currentMasterEvent?.image || DEFAULT_EVENT_IMAGE);
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
      setImagePreview(currentMasterEvent?.image || DEFAULT_EVENT_IMAGE);
    };
    reader.readAsDataURL(file);
  };

  const handleDayOfWeekChange = (dayId: number) => {
    setSelectedDaysOfWeek(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId]
    );
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
    setFormError(null);
    setIsSubmitting(true);

    if (!currentUser || !currentMasterEvent || !hostingGroup) {
      setFormError("Cannot save event. Required data is missing."); setIsSubmitting(false); return;
    }
    if ((!hostingGroup.adminIds.includes(currentUser.uid) && hostingGroup.creatorId !== currentUser.uid)) {
        setFormError(t.permissionDenied(hostingGroup.name));
        toast({ title: t.toast_permissionDenied_title, variant: "destructive"}); setIsSubmitting(false); return;
    }
    if (!eventName.trim()) { setFormError("Event name is required."); setIsSubmitting(false); return; }
    if (!eventDate) { setFormError("Event date is required."); setIsSubmitting(false); return; }

    const today = new Date(); today.setHours(0, 0, 0, 0);
    const selectedEventDate = new Date(eventDate + 'T00:00:00');

    if (!isRecurring && selectedEventDate < today && eventDate !== currentMasterEvent.date) {
      setFormError(t.error_datePast); setIsSubmitting(false); return;
    }

    const recurrenceError = validateRecurrenceSettings();
    if (recurrenceError) {
      setFormError(recurrenceError);
      setIsSubmitting(false);
      return;
    }

    const finalImage = selectedImageBase64 || currentMasterEvent.image || DEFAULT_EVENT_IMAGE;

    const updatedEventDataForServer: Partial<Omit<Event, 'id' | 'groupId'>> = {
      name: eventName,
      description: eventDescription,
      date: eventDate,
      time: eventTime,
      duration: eventDurationHours ? Math.round(eventDurationHours * 60) : undefined,
      location: eventLocation,
      image: finalImage,
      isRecurring: isRecurring,
      attendees: currentMasterEvent.attendees, 
      instanceAttendees: currentMasterEvent.instanceAttendees,
      instanceMetadata: currentMasterEvent.instanceMetadata,
      isCancelled: currentMasterEvent.isCancelled,
    };

    if (isRecurring) {
      updatedEventDataForServer.recurrence = {
        frequency: recurrenceFrequency,
        interval: recurrenceInterval,
        endDate: recurrenceEndDate || undefined,
      };
      if (recurrenceFrequency === 'weekly') {
        updatedEventDataForServer.recurrence.daysOfWeek = selectedDaysOfWeek.sort((a,b) => a-b);
      }
      if (recurrenceFrequency === 'monthly' && recurrenceDayOfMonth) {
        updatedEventDataForServer.recurrence.dayOfMonth = recurrenceDayOfMonth;
      }
    } else {
      updatedEventDataForServer.recurrence = undefined; 
    }

    try {
      const result = await updateMasterEvent(currentMasterEvent.id, updatedEventDataForServer, currentUser.uid, currentMasterEvent.groupId);

      if (result.success && result.updatedEvent) {
        dispatchStorageUpdatedEvent(); 

        toast({ title: t.toast_eventUpdated_title, description: t.toast_eventUpdated_desc(eventName) });
        router.push(`/events/${currentMasterEvent.id}`); 
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

  if (isLoading || authLoading) {
    return (
      <PageShell title={t.loadingTitle} description={t.loadingDescription}>
        <Card className="w-full max-w-2xl mx-auto shadow-lg p-6">
            <div className="flex items-center justify-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        </Card>
      </PageShell>
    );
  }

  if (accessDeniedError) {
    return (
      <PageShell title={t.accessDeniedTitle} description={t.accessDeniedDesc}>
        <Card className="w-full max-w-md mx-auto text-center py-10 shadow-md">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>{accessDeniedError.includes("not found") ? "Event Not Found" : "Permission Denied"}</CardTitle><CardDescription>{accessDeniedError}</CardDescription></CardHeader>
            <CardContent><Button asChild variant="outline"><Link href={currentMasterEvent?.id ? `/events/${currentMasterEvent.id}` : "/events"}><ArrowLeft className="mr-2 h-4 w-4" /> {t.back}</Link></Button></CardContent>
        </Card>
      </PageShell>
    );
  }

  if (!currentMasterEvent || !hostingGroup) {
    return (
      <PageShell title={t.errorLoadingTitle} description={t.errorLoadingDesc}>
        <Card className="w-full max-w-md mx-auto text-center py-10 shadow-md">
            <CardHeader><AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" /><CardTitle>Loading Error</CardTitle></CardHeader>
             <CardContent><Button asChild variant="outline"><Link href="/events"><ArrowLeft className="mr-2 h-4 w-4" /> {t.backToEvents}</Link></Button></CardContent>
        </Card>
      </PageShell>
    );
  }

  const canEditEvent = currentUser && hostingGroup && (hostingGroup.adminIds.includes(currentUser.uid) || hostingGroup.creatorId === currentUser.uid);
  
  const effectiveImageSrc = imagePreview || DEFAULT_EVENT_IMAGE;
  const isDataUri = effectiveImageSrc.startsWith('data:image');

  return (
    <PageShell title={t.editEventTitle(currentMasterEvent.name)} description={t.editEventDesc}>
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <form onSubmit={handleSubmit}>
          <CardHeader><CardTitle className="font-headline">{t.eventDetails}</CardTitle><CardDescription>{t.updateInfo}</CardDescription></CardHeader>
          <CardContent className="space-y-6">

            <div className="space-y-2"><Label htmlFor="eventName">{t.eventName}</Label><Input id="eventName" value={eventName} onChange={(e) => { setEventName(e.target.value); setFormError(null); }} aria-required="true"/></div>
            <div className="space-y-2"><Label htmlFor="eventDescription">{t.description}</Label><Textarea id="eventDescription" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={4}/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="eventDate">{isRecurring ? t.startDate : t.date}</Label>
                <div className="flex items-center gap-2"><Input id="eventDate" type="date" value={eventDate} onChange={(e) => { setEventDate(e.target.value); setFormError(null); }} aria-required="true"/><CalendarIcon className="h-5 w-5 text-muted-foreground" /></div>
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
              
              <div className="mt-2 border rounded-md p-2 inline-block">
                 <div className="relative w-[200px] h-[133px]">
                  <Image
                    src={effectiveImageSrc}
                    alt={t.imagePreview}
                    fill
                    style={{ objectFit: "cover" }}
                    className="rounded"
                    unoptimized={isDataUri}
                    sizes={isDataUri ? undefined : "200px"}
                    data-ai-hint="event party"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{t.imageSizeNote(MAX_ORIGINAL_IMAGE_SIZE_MB)}</p>
            </div>
            <div className="space-y-2"><Label>{t.group}</Label><div className="flex items-center gap-2 p-3 border rounded-md bg-muted"><Users className="h-5 w-5 text-muted-foreground" /><p className="text-sm">{hostingGroup.name}</p></div></div>

            <div className="space-y-4 p-4 border rounded-md">
              <div className="flex items-center space-x-2">
                <Switch id="isRecurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
                <Label htmlFor="isRecurring" className="flex items-center text-base font-semibold"><RotateCcw className="mr-2 h-4 w-4" /> {t.recurring}</Label>
              </div>
              {isRecurring && (
                <div className="space-y-4 pl-2 mt-2 border-l-2 ml-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label htmlFor="recurrenceFrequency">{t.frequency}</Label>
                      <Select value={recurrenceFrequency} onValueChange={(v: 'daily'|'weekly'|'monthly') => setRecurrenceFrequency(v)}>
                        <SelectTrigger id="recurrenceFrequency"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="daily">{t.daily}</SelectItem><SelectItem value="weekly">{t.weekly}</SelectItem><SelectItem value="monthly">{t.monthly}</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2"><Label htmlFor="recurrenceInterval">{t.repeatEvery}</Label>
                      <div className="flex items-center gap-2">
                        <Input id="recurrenceInterval" type="number" min="1" value={recurrenceInterval} onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)} className="w-20"/>
                        <span className="text-sm text-muted-foreground">{recurrenceFrequency === 'daily' ? t.days : recurrenceFrequency === 'weekly' ? t.weeks : t.months}</span>
                      </div>
                    </div>
                  </div>

                  {recurrenceFrequency === 'weekly' && (
                    <div className="space-y-2"><Label>{t.repeatOn}</Label>
                      <div className="flex flex-wrap gap-x-4 gap-y-2">
                        {DAYS_OF_WEEK.map(day => (<div key={day.id} className="flex items-center space-x-2"><Checkbox id={`day-${day.id}`} checked={selectedDaysOfWeek.includes(day.id)} onCheckedChange={() => handleDayOfWeekChange(day.id)}/><Label htmlFor={`day-${day.id}`} className="font-normal">{day.label}</Label></div>))}
                      </div>
                    </div>
                  )}

                  {recurrenceFrequency === 'monthly' && (<div className="space-y-2"><Label htmlFor="recurrenceDayOfMonth">{t.dayOfMonth}</Label><Input id="recurrenceDayOfMonth" type="number" min="1" max="31" value={recurrenceDayOfMonth||""} onChange={(e) => setRecurrenceDayOfMonth(e.target.value?parseInt(e.target.value,10):undefined)}/></div>)}
                  <div className="space-y-2"><Label htmlFor="recurrenceEndDate">{t.repeatUntil}</Label><Input id="recurrenceEndDate" type="date" value={recurrenceEndDate||""} onChange={(e) => setRecurrenceEndDate(e.target.value||undefined)}/><p className="text-xs text-muted-foreground">{t.repeatUntilDesc}</p></div>
                </div>
              )}
            </div>
            {formError && <p className="text-sm text-destructive">{formError}</p>}
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button variant="outline" asChild type="button"><Link href={`/events/${currentMasterEvent.id}`}>{t.cancel}</Link></Button>
            <Button type="submit" disabled={!canEditEvent || isLoading || isSubmitting}>{isSubmitting ? t.saving : t.saveChanges}</Button>
          </CardFooter>
        </form>
      </Card>
    </PageShell>
  );
}

export default function EditEventPage() {
  return (
    <Suspense fallback={<PageShell title="Loading Event Editor..." description="Please wait..."><Card className="w-full max-w-2xl mx-auto shadow-lg p-10 text-center">Loading form...</Card></PageShell>}>
      <EditEventForm />
    </Suspense>
  );
}
