import { appConfig } from '../config/appConfig'
import type { LegalDocumentType } from '../types'
import { SecondaryButton } from './brand'
import { Sheet } from './Sheet'

const TITLES: Record<LegalDocumentType, string> = {
  privacy: 'Política de Privacidad',
  terms: 'Términos y Condiciones',
  cookies: 'Uso de Cookies y Almacenamiento Local',
  responsible: 'Juego Responsable (+18)',
}

const PARAGRAPHS: Record<LegalDocumentType, string[]> = {
  privacy: [
    `Esta aplicación únicamente procesa los datos mínimos necesarios para gestionar tu solicitud de acceso a ${appConfig.domain}, como el nombre o apodo elegido y un identificador aleatorio de dispositivo (clientId).`,
    'No almacenamos contraseñas en texto plano, tokens sensibles ni comprobantes en el almacenamiento local de preferencias.',
    'El texto legal completo y la política de tratamiento de datos deben ser publicados y confirmados por el operador responsable del servicio.',
  ],
  terms: [
    'El acceso está destinado exclusivamente a personas mayores de 18 años en jurisdicciones donde el servicio esté habilitado conforme a la normativa aplicable.',
    'La creación de cuentas, disponibilidad de saldo, acreditación de transferencias y retiros dependen exclusivamente de la validación del operador en el servidor oficial.',
    'Ningún resultado está garantizado. Los términos comerciales definitivos deben ser revisados y aprobados por asesoría legal competente.',
  ],
  cookies: [
    'La app guarda únicamente preferencias no sensibles en el dispositivo, como el estado de bienvenida, preferencias de visualización del chat y el identificador técnico clientId para atribución básica.',
    'Podés limpiar tu sesión en cualquier momento desde el menú de cuenta con la opción Cerrar sesión.',
  ],
  responsible: [
    'Participá únicamente con dinero destinado al entretenimiento, estableciendo límites claros de tiempo y presupuesto antes de empezar.',
    'Nunca intentes recuperar pérdidas ni operes bajo estrés o urgencia. Ninguna herramienta o aplicación puede garantizar ganancias.',
    'Si sentís que el juego deja de ser recreativo o te genera malestar, buscá orientación profesional en las líneas de asistencia de tu jurisdicción y suspendé tu actividad.',
  ],
}

export function LegalSheet({
  documentType,
  onClose,
}: {
  documentType: LegalDocumentType | null
  onClose: () => void
}) {
  if (!documentType) return null
  const title = TITLES[documentType]
  const paragraphs = PARAGRAPHS[documentType]

  return (
    <Sheet open onClose={onClose} labelledBy="legal-sheet-title" showClose closeLabel="Cerrar">
      <h2
        id="legal-sheet-title"
        className="pr-10 font-display text-xl font-bold leading-tight text-ink-primary"
      >
        {title}
      </h2>

      <div className="mt-3 space-y-3">
        {paragraphs.map((paragraph) => (
          <p key={paragraph} className="text-sm leading-relaxed text-ink-muted">
            {paragraph}
          </p>
        ))}
      </div>

      <div className="mt-4 rounded-[14px] border border-borderSubtle bg-surface p-3.5">
        <p className="text-xs leading-relaxed text-ink-subtle">{appConfig.jurisdictionNotice}</p>
      </div>

      <div className="mt-4">
        <SecondaryButton onClick={onClose}>Entendido</SecondaryButton>
      </div>
    </Sheet>
  )
}
