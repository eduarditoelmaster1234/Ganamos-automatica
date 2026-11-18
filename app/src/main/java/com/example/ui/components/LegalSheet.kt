package com.example.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.config.AppConfig
import com.example.domain.model.LegalDocumentType
import com.example.ui.theme.BgElevated
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.SurfaceCard
import com.example.ui.theme.TextMuted
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSubtle

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LegalDocumentSheet(
  documentType: LegalDocumentType,
  onDismiss: () -> Unit,
) {
  val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
  val (title, paragraphs) = when (documentType) {
    LegalDocumentType.Privacy -> "Política de Privacidad" to listOf(
      "Esta aplicación únicamente procesa los datos mínimos necesarios para gestionar tu solicitud de acceso a ${AppConfig.domain}, como el nombre o apodo elegido y un identificador aleatorio de dispositivo (clientId).",
      "No almacenamos contraseñas en texto plano, tokens sensibles ni comprobantes en el almacenamiento local de preferencias.",
      "El texto legal completo y la política de tratamiento de datos deben ser publicados y confirmados por el operador responsable del servicio.",
    )
    LegalDocumentType.Terms -> "Términos y Condiciones" to listOf(
      "El acceso está destinado exclusivamente a personas mayores de 18 años en jurisdicciones donde el servicio esté habilitado conforme a la normativa aplicable.",
      "La creación de cuentas, disponibilidad de saldo, acreditación de transferencias y retiros dependen exclusivamente de la validación del operador en el servidor oficial.",
      "Ningún resultado está garantizado. Los términos comerciales definitivos deben ser revisados y aprobados por asesoría legal competente.",
    )
    LegalDocumentType.Cookies -> "Uso de Cookies y Almacenamiento Local" to listOf(
      "La app guarda únicamente preferencias no sensibles en el dispositivo, como el estado de bienvenida, preferencias de visualización del chat y el identificador técnico clientId para atribución básica.",
      "Podés limpiar tu sesión en cualquier momento desde el menú de cuenta con la opción Cerrar sesión.",
    )
    LegalDocumentType.ResponsibleGaming -> "Juego Responsable (+18)" to listOf(
      "Participá únicamente con dinero destinado al entretenimiento, estableciendo límites claros de tiempo y presupuesto antes de empezar.",
      "Nunca intentes recuperar pérdidas ni operes bajo estrés o urgencia. Ninguna herramienta o aplicación puede garantizar ganancias.",
      "Si sentís que el juego deja de ser recreativo o te genera malestar, buscá orientación profesional en las líneas de asistencia de tu jurisdicción y suspendé tu actividad.",
    )
  }

  ModalBottomSheet(
    onDismissRequest = onDismiss,
    sheetState = sheetState,
    containerColor = BgElevated,
    contentColor = TextPrimary,
    shape = RoundedCornerShape(topStart = 26.dp, topEnd = 26.dp),
  ) {
    Column(
      modifier = Modifier
        .fillMaxWidth()
        .navigationBarsPadding()
        .padding(horizontal = 20.dp)
        .padding(bottom = 24.dp)
        .verticalScroll(rememberScrollState()),
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
      ) {
        Text(
          text = title,
          style = MaterialTheme.typography.headlineSmall,
          color = TextPrimary,
          modifier = Modifier.weight(1f),
        )
        IconButton(
          onClick = onDismiss,
          modifier = Modifier.testTag("close_legal_sheet_button"),
        ) {
          Icon(
            imageVector = Icons.Rounded.Close,
            contentDescription = stringResource(R.string.cd_close),
            tint = TextMuted,
          )
        }
      }

      Spacer(modifier = Modifier.height(12.dp))

      paragraphs.forEach { paragraph ->
        Text(
          text = paragraph,
          style = MaterialTheme.typography.bodyMedium,
          color = TextMuted,
          modifier = Modifier.padding(bottom = 12.dp),
        )
      }

      Surface(
        color = SurfaceCard,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(1.dp, BorderSubtle),
        modifier = Modifier.fillMaxWidth(),
      ) {
        Text(
          text = AppConfig.jurisdictionNotice,
          style = MaterialTheme.typography.bodySmall,
          color = TextSubtle,
          modifier = Modifier.padding(14.dp),
        )
      }

      Spacer(modifier = Modifier.height(16.dp))

      GanamosSecondaryButton(
        text = "Entendido",
        onClick = onDismiss,
        modifier = Modifier.testTag("legal_acknowledge_button"),
      )
    }
  }
}
