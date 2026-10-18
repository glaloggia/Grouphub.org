
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";

const translations = {
  en: {
    title: "Terms and Conditions of Use",
    lastUpdated: (date: string) => `Last updated: ${date}`,
    backToHome: "Back to Homepage",
    sections: {
      acceptance: {
        title: "1. Acceptance of Terms",
        content: "By accessing and using **GroupHub** (hereinafter, 'the Website'), you agree to comply with and be bound by the following terms and conditions of use. If you do not agree to these terms, you should not use the Website."
      },
      userContent: {
        title: "2. User-Generated Content",
        content: "You are solely responsible for all content, including text, images, information, and other materials (hereinafter, 'User Content') that you post, upload, share, or otherwise transmit through the Website. You represent and warrant that you have all necessary rights to post your User Content and that such content does not infringe on the rights of third parties or violate any applicable laws."
      },
      disclaimer: {
        title: "3. Disclaimer regarding User Content",
        content: `**You understand and agree that the Website is a platform and that we, as owners and operators, are not responsible for User Content posted by users.**
        
        We do not monitor, endorse, represent, or guarantee the completeness, truthfulness, accuracy, or reliability of any User Content posted on the Website. By using the Website, you may be exposed to User Content that might be offensive, harmful, inaccurate, or otherwise inappropriate. Under no circumstances will we be liable in any way for any User Content, including, but not limited to, any errors or omissions in any content, or any loss or damage of any kind incurred as a result of the use of any User Content posted, emailed, transmitted, or otherwise made available via the Website.`
      },
      conduct: {
        title: "4. User Conduct",
        content: `You agree not to use the Website to:
- Post content that is unlawful, harassing, defamatory, abusive, threatening, harmful, vulgar, obscene, or otherwise objectionable.
- Violate the intellectual property rights of third parties.
- Transmit computer viruses or any other destructive code.

We reserve the right, but have no obligation, to remove any content and/or suspend or terminate user accounts that, in our sole discretion, violate these terms, without prior notice.`
      },
      modification: {
        title: "5. Modification of Terms",
        content: "We reserve the right to modify these terms and conditions at any time. Your continued use of the Website after any changes will constitute your acceptance of the new terms."
      }
    }
  },
  es: {
    title: "Términos y Condiciones de Uso",
    lastUpdated: (date: string) => `Última actualización: ${date}`,
    backToHome: "Volver a la página principal",
    sections: {
      acceptance: {
        title: "1. Aceptación de los Términos",
        content: "Al acceder y utilizar **GroupHub** (en adelante, 'el Sitio Web'), usted acepta cumplir y estar sujeto a los siguientes términos y condiciones de uso. Si no está de acuerdo con estos términos, no debe utilizar el Sitio Web."
      },
      userContent: {
        title: "2. Contenido Generado por el Usuario",
        content: "Usted es el único responsable de todo el contenido, incluyendo textos, imágenes, información y otros materiales (en adelante, 'Contenido de Usuario') que publique, cargue, comparta o transmita a través del Sitio Web. Usted declara y garantiza que tiene todos los derechos necesarios para publicar su Contenido de Usuario y que dicho contenido no infringe los derechos de terceros ni viola ninguna ley aplicable."
      },
      disclaimer: {
        title: "3. Exención de Responsabilidad sobre el Contenido de Usuario",
        content: `**Usted entiende y acepta que el Sitio Web es una plataforma y que nosotros, como propietarios y operadores, no somos responsables del Contenido de Usuario publicado por los usuarios.**
        
        No supervisamos, respaldamos, representamos ni garantizamos la integridad, veracidad, exactitud o fiabilidad de ningún Contenido de Usuario publicado en el Sitio Web. Al utilizar el Sitio Web, usted puede estar expuesto a Contenido de Usuario que podría ser ofensivo, dañino, inexacto o inapropiado. Bajo ninguna circunstancia seremos responsables de ninguna manera por ningún Contenido de Usuario, incluyendo, entre otros, cualquier error u omisión en dicho contenido, o cualquier pérdida o daño de cualquier tipo incurrido como resultado del uso de cualquier Contenido de Usuario publicado, enviado por correo electrónico, transmitido o puesto a disposición de otro modo a través del Sitio Web.`
      },
      conduct: {
        title: "4. Conducta del Usuario",
        content: `Usted se compromete a no utilizar el Sitio Web para:
- Publicar contenido ilegal, acosador, difamatorio, abusivo, amenazante, dañino, vulgar, obsceno o de cualquier otra forma objetable.
- Violar los derechos de propiedad intelectual de terceros.
- Transmitir virus informáticos o cualquier otro código destructivo.

Nos reservamos el derecho, pero no tenemos la obligación, de eliminar cualquier contenido y/o suspender o eliminar cuentas de usuario que, a nuestra entera discreción, violen estos términos, sin previo aviso.`
      },
      modification: {
        title: "5. Modificación de los Términos",
        content: "Nos reservamos el derecho de modificar estos términos y condiciones en cualquier momento. La continuación del uso del Sitio Web después de cualquier cambio constituirá su aceptación de los nuevos términos."
      }
    }
  },
  pt: {
    title: "Termos e Condições de Uso",
    lastUpdated: (date: string) => `Última atualização: ${date}`,
    backToHome: "Voltar para a página inicial",
    sections: {
      acceptance: {
        title: "1. Aceitação dos Termos",
        content: "Ao acessar e usar o **GroupHub** (doravante, 'o Site'), você concorda em cumprir e estar vinculado aos seguintes termos e condições de uso. Se você não concorda com estes termos, não deve usar o Site."
      },
      userContent: {
        title: "2. Conteúdo Gerado pelo Usuário",
        content: "Você é o único responsável por todo o conteúdo, incluindo textos, imagens, informações e outros materiais (doravante, 'Conteúdo do Usuário') que você posta, carrega, compartilha ou transmite através do Site. Você declara e garante que possui todos os direitos necessários para postar seu Conteúdo do Usuário e que tal conteúdo não infringe os direitos de terceiros nem viola nenhuma lei aplicável."
      },
      disclaimer: {
        title: "3. Isenção de Responsabilidade sobre o Conteúdo do Usuário",
        content: `**Você entende e concorda que o Site é uma plataforma e que nós, como proprietários e operadores, não somos responsáveis pelo Conteúdo do Usuário postado pelos usuários.**
        
        Não monitoramos, endossamos, representamos ou garantimos a integridade, veracidade, precisão ou confiabilidade de qualquer Conteúdo do Usuário postado no Site. Ao usar o Site, você pode ser exposto a Conteúdo do Usuário que pode ser ofensivo, prejudicial, impreciso ou de outra forma inadequado. Sob nenhuma circunstância seremos responsáveis de forma alguma por qualquer Conteúdo do Usuário, incluindo, mas não se limitando a, quaisquer erros ou omissões em qualquer conteúdo, ou qualquer perda ou dano de qualquer tipo incorrido como resultado do uso de qualquer Conteúdo do Usuário postado, enviado por e-mail, transmitido ou disponibilizado de outra forma através do Site.`
      },
      conduct: {
        title: "4. Conduta do Usuário",
        content: `Você concorda em não usar o Site para:
- Postar conteúdo ilegal, assediador, difamatório, abusivo, ameaçador, prejudicial, vulgar, obsceno ou de outra forma questionável.
- Violar os direitos de propriedade intelectual de terceiros.
- Transmitir vírus de computador ou qualquer outro código destrutivo.

Reservamo-nos o direito, mas não temos a obrigação, de remover qualquer conteúdo e/ou suspender ou encerrar contas de usuários que, a nosso exclusivo critério, violem estes termos, sem aviso prévio.`
      },
      modification: {
        title: "5. Modificação dos Termos",
        content: "Reservamo-nos o direito de modificar estes termos e condições a qualquer momento. Seu uso contínuo do Site após quaisquer alterações constituirá sua aceitação dos novos termos."
      }
    }
  },
  fr: {
    title: "Termes et Conditions d'Utilisation",
    lastUpdated: (date: string) => `Dernière mise à jour : ${date}`,
    backToHome: "Retour à la page d'accueil",
    sections: {
      acceptance: {
        title: "1. Acceptation des Conditions",
        content: "En accédant et en utilisant **GroupHub** (ci-après, 'le Site Web'), vous acceptez de vous conformer et d'être lié par les termes et conditions d'utilisation suivants. Si vous n'êtes pas d'accord avec ces termes, vous ne devez pas utiliser le Site Web."
      },
      userContent: {
        title: "2. Contenu Généré par l'Utilisateur",
        content: "Vous êtes seul responsable de tout le contenu, y compris les textes, images, informations et autres matériaux (ci-après, 'Contenu Utilisateur') que vous publiez, téléchargez, partagez ou transmettez via le Site Web. Vous déclarez et garantissez que vous disposez de tous les droits nécessaires pour publier votre Contenu Utilisateur et que ce contenu n'enfreint pas les droits de tiers ni ne viole les lois applicables."
      },
      disclaimer: {
        title: "3. Clause de Non-responsabilité concernant le Contenu Utilisateur",
        content: `**Vous comprenez et acceptez que le Site Web est une plateforme et que nous, en tant que propriétaires et opérateurs, ne sommes pas responsables du Contenu Utilisateur publié par les utilisateurs.**
        
        Nous ne surveillons, n'approuvons, ne représentons ni ne garantissons l'exhaustivité, la véracité, l'exactitude ou la fiabilité de tout Contenu Utilisateur publié sur le Site Web. En utilisant le Site Web, vous pouvez être exposé à du Contenu Utilisateur qui pourrait être offensant, nuisible, inexact ou autrement inapproprié. En aucun cas, nous ne serons responsables de quelque manière que ce soit pour tout Contenu Utilisateur, y compris, mais sans s'y limiter, toute erreur ou omission dans un contenu, ou toute perte ou dommage de quelque nature que ce soit résultant de l'utilisation de tout Contenu Utilisateur publié, envoyé par e-mail, transmis ou autrement mis à disposition via le Site Web.`
      },
      conduct: {
        title: "4. Conduite de l'Utilisateur",
        content: `Vous vous engagez à ne pas utiliser le Site Web pour :
- Publier du contenu illégal, harcelant, diffamatoire, abusif, menaçant, nuisible, vulgaire, obscène ou autrement répréhensible.
- Violer les droits de propriété intellectuelle de tiers.
- Transmettre des virus informatiques ou tout autre code destructeur.

Nous nous réservons le droit, mais n'avons aucune obligation, de supprimer tout contenu et/ou de suspendre ou de résilier les comptes d'utilisateurs qui, à notre seule discrétion, violent ces termes, sans préavis.`
      },
      modification: {
        title: "5. Modification des Conditions",
        content: "Nous nous réservons le droit de modifier ces termes et conditions à tout moment. Votre utilisation continue du Site Web après toute modification constituera votre acceptation des nouvelles conditions."
      }
    }
  },
  de: {
    title: "Nutzungsbedingungen",
    lastUpdated: (date: string) => `Zuletzt aktualisiert: ${date}`,
    backToHome: "Zurück zur Startseite",
    sections: {
      acceptance: {
        title: "1. Annahme der Bedingungen",
        content: "Durch den Zugriff auf und die Nutzung von **GroupHub** (im Folgenden 'die Website') erklären Sie sich damit einverstanden, die folgenden Nutzungsbedingungen einzuhalten und an diese gebunden zu sein. Wenn Sie diesen Bedingungen nicht zustimmen, dürfen Sie die Website nicht nutzen."
      },
      userContent: {
        title: "2. Benutzergenerierte Inhalte",
        content: "Sie sind allein verantwortlich für alle Inhalte, einschließlich Texte, Bilder, Informationen und anderer Materialien (im Folgenden 'Benutzerinhalte'), die Sie über die Website veröffentlichen, hochladen, teilen oder anderweitig übertragen. Sie versichern und garantieren, dass Sie über alle erforderlichen Rechte zur Veröffentlichung Ihrer Benutzerinhalte verfügen und dass diese Inhalte nicht die Rechte Dritter verletzen oder gegen geltende Gesetze verstoßen."
      },
      disclaimer: {
        title: "3. Haftungsausschluss für Benutzerinhalte",
        content: `**Sie verstehen und stimmen zu, dass die Website eine Plattform ist und dass wir als Eigentümer und Betreiber nicht für die von Benutzern veröffentlichten Benutzerinhalte verantwortlich sind.**
        
        Wir überwachen, befürworten, vertreten oder garantieren nicht die Vollständigkeit, Wahrhaftigkeit, Genauigkeit oder Zuverlässigkeit von Benutzerinhalten, die auf der Website veröffentlicht werden. Durch die Nutzung der Website können Sie Benutzerinhalten ausgesetzt sein, die beleidigend, schädlich, ungenau oder anderweitig unangemessen sein könnten. Unter keinen Umständen haften wir in irgendeiner Weise für Benutzerinhalte, einschließlich, aber nicht beschränkt auf Fehler oder Auslassungen in Inhalten oder Verluste oder Schäden jeglicher Art, die durch die Nutzung von auf der Website veröffentlichten, per E-Mail gesendeten, übertragenen oder anderweitig zur Verfügung gestellten Benutzerinhalten entstehen.`
      },
      conduct: {
        title: "4. Benutzerverhalten",
        content: `Sie stimmen zu, die Website nicht zu nutzen, um:
- Inhalte zu veröffentlichen, die rechtswidrig, belästigend, diffamierend, missbräuchlich, bedrohlich, schädlich, vulgär, obszön oder anderweitig anstößig sind.
- Die geistigen Eigentumsrechte Dritter zu verletzen.
- Computerviren oder anderen zerstörerischen Code zu übertragen.

Wir behalten uns das Recht vor, sind aber nicht verpflichtet, Inhalte zu entfernen und/oder Benutzerkonten zu sperren oder zu kündigen, die nach unserem alleinigen Ermessen gegen diese Bedingungen verstoßen, ohne vorherige Ankündigung.`
      },
      modification: {
        title: "5. Änderung der Bedingungen",
        content: "Wir behalten uns das Recht vor, diese Nutzungsbedingungen jederzeit zu ändern. Ihre fortgesetzte Nutzung der Website nach Änderungen stellt Ihre Annahme der neuen Bedingungen dar."
      }
    }
  },
  it: {
    title: "Termini e Condizioni d'Uso",
    lastUpdated: (date: string) => `Ultimo aggiornamento: ${date}`,
    backToHome: "Torna alla homepage",
    sections: {
      acceptance: {
        title: "1. Accettazione dei Termini",
        content: "Accedendo e utilizzando **GroupHub** (di seguito, 'il Sito Web'), l'utente accetta di rispettare e di essere vincolato dai seguenti termini e condizioni d'uso. Se non si è d'accordo con questi termini, non si dovrebbe utilizzare il Sito Web."
      },
      userContent: {
        title: "2. Contenuto Generato dall'Utente",
        content: "L'utente è l'unico responsabile di tutti i contenuti, inclusi testi, immagini, informazioni e altri materiali (di seguito, 'Contenuto Utente') che pubblica, carica, condivide o trasmette in altro modo attraverso il Sito Web. L'utente dichiara e garantisce di possedere tutti i diritti necessari per pubblicare il proprio Contenuto Utente e che tale contenuto non viola i diritti di terzi né alcuna legge applicabile."
      },
      disclaimer: {
        title: "3. Esclusione di Responsabilità per il Contenuto Utente",
        content: `**L'utente comprende e accetta che il Sito Web è una piattaforma e che noi, in qualità di proprietari e gestori, non siamo responsabili per il Contenuto Utente pubblicato dagli utenti.**
        
        Non monitoriamo, approviamo, rappresentiamo o garantiamo la completezza, veridicità, accuratezza o affidabilità di alcun Contenuto Utente pubblicato sul Sito Web. Utilizzando il Sito Web, l'utente potrebbe essere esposto a Contenuto Utente che potrebbe essere offensivo, dannoso, impreciso o altrimenti inappropriato. In nessun caso saremo responsabili in alcun modo per qualsiasi Contenuto Utente, inclusi, a titolo esemplificativo, eventuali errori od omissioni in qualsiasi contenuto, o qualsiasi perdita o danno di qualsiasi tipo subiti a seguito dell'uso di qualsiasi Contenuto Utente pubblicato, inviato via email, trasmesso o altrimenti reso disponibile tramite il Sito Web.`
      },
      conduct: {
        title: "4. Condotta dell'Utente",
        content: `L'utente si impegna a non utilizzare il Sito Web per:
- Pubblicare contenuti illegali, molesti, diffamatori, abusivi, minacciosi, dannosi, volgari, osceni o altrimenti discutibili.
- Violare i diritti di proprietà intellettuale di terzi.
- Trasmettere virus informatici o qualsiasi altro codice distruttivo.

Ci riserviamo il diritto, ma non l'obbligo, di rimuovere qualsiasi contenuto e/o sospendere o chiudere account utente che, a nostra esclusiva discrezione, violino questi termini, senza preavviso.`
      },
      modification: {
        title: "5. Modifica dei Termini",
        content: "Ci riserviamo il diritto di modificare questi termini e condizioni in qualsiasi momento. L'uso continuato del Sito Web dopo eventuali modifiche costituirà l'accettazione dei nuovi termini."
      }
    }
  },
  ru: {
    title: "Условия и положения использования",
    lastUpdated: (date: string) => `Последнее обновление: ${date}`,
    backToHome: "Вернуться на главную",
    sections: {
      acceptance: {
        title: "1. Принятие Условий",
        content: "Заходя на сайт **GroupHub** (далее 'Сайт') и используя его, вы соглашаетесь соблюдать следующие условия и положения использования. Если вы не согласны с этими условиями, вы не должны использовать Сайт."
      },
      userContent: {
        title: "2. Контент, созданный пользователями",
        content: "Вы несете полную ответственность за весь контент, включая тексты, изображения, информацию и другие материалы (далее 'Пользовательский контент'), который вы публикуете, загружаете, делитесь или иным образом передаете через Сайт. Вы заявляете и гарантируете, что у вас есть все необходимые права для публикации вашего Пользовательского контента и что такой контент не нарушает права третьих лиц и не противоречит действующему законодательству."
      },
      disclaimer: {
        title: "3. Отказ от ответственности за Пользовательский контент",
        content: `**Вы понимаете и соглашаетесь с тем, что Сайт является платформой, и что мы, как владельцы и операторы, не несем ответственности за Пользовательский контент, размещенный пользователями.**
        
        Мы не отслеживаем, не одобряем, не представляем и не гарантируем полноту, правдивость, точность или надежность любого Пользовательского контента, размещенного на Сайте. Используя Сайт, вы можете столкнуться с Пользовательским контентом, который может быть оскорбительным, вредным, неточным или иным образом неприемлемым. Ни при каких обстоятельствах мы не несем ответственности за любой Пользовательский контент, включая, но не ограничиваясь, любые ошибки или упущения в любом контенте, а также любые убытки или ущерб любого рода, понесенные в результате использования любого Пользовательского контента, размещенного, отправленного по электронной почте, переданного или иным образом доступного через Сайт.`
      },
      conduct: {
        title: "4. Поведение пользователя",
        content: `Вы соглашаетесь не использовать Сайт для:
- Публикации незаконного, преследующего, клеветнического, оскорбительного, угрожающего, вредного, вульгарного, непристойного или иного нежелательного контента.
- Нарушения прав интеллектуальной собственности третьих лиц.
- Передачи компьютерных вирусов или любого другого разрушительного кода.

Мы оставляем за собой право, но не обязаны, удалять любой контент и/или приостанавливать или удалять учетные записи пользователей, которые, по нашему единоличному усмотрению, нарушают эти условия, без предварительного уведомления.`
      },
      modification: {
        title: "5. Изменение Условий",
        content: "Мы оставляем за собой право изменять эти условия и положения в любое время. Ваше дальнейшее использование Сайта после любых изменений будет означать ваше согласие с новыми условиями."
      }
    }
  }
};


type Language = keyof typeof translations;

export default function TermsPage() {
  const [lang, setLang] = useState<Language>('en');
  const [lastUpdated, setLastUpdated] = useState('');

  useEffect(() => {
    // Detect browser language
    if (typeof window !== "undefined") {
      const browserLang = navigator.language.split('-')[0] as Language;
      if (translations[browserLang]) {
        setLang(browserLang);
      }
    }
  }, []);

  useEffect(() => {
    // Set date on client-side to avoid hydration mismatch and format it according to the detected language
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
    setLastUpdated(formattedDate);
  }, [lang]);
  
  const t = translations[lang] || translations['en']; // Fallback to English

  return (
    <div className="bg-background min-h-screen">
        <div className="container mx-auto p-4 sm:p-6 md:p-8 max-w-4xl">
            <header className="py-4">
                <Button variant="outline" asChild>
                    <Link href="/">
                        <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToHome}
                    </Link>
                </Button>
            </header>
            <main>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-3xl font-bold">{t.title}</CardTitle>
                        {lastUpdated && <CardDescription>{t.lastUpdated(lastUpdated)}</CardDescription>}
                    </CardHeader>
                    <CardContent className="prose dark:prose-invert max-w-none">
                        <h3>{t.sections.acceptance.title}</h3>
                        <ReactMarkdown>{t.sections.acceptance.content}</ReactMarkdown>
                        
                        <h3>{t.sections.disclaimer.title}</h3>
                         <ReactMarkdown>{t.sections.disclaimer.content}</ReactMarkdown>
                        
                        <h3>{t.sections.userContent.title}</h3>
                        <ReactMarkdown>{t.sections.userContent.content}</ReactMarkdown>
                        
                        <h3>{t.sections.conduct.title}</h3>
                        <ReactMarkdown>{t.sections.conduct.content}</ReactMarkdown>

                        <h3>{t.sections.modification.title}</h3>
                        <ReactMarkdown>{t.sections.modification.content}</ReactMarkdown>
                    </CardContent>
                </Card>
            </main>
        </div>
    </div>
  );
}
