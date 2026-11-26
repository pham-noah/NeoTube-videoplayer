package expo.modules.noutubeview

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import java.io.File

/*
 * Handing a downloaded APK to the system installer.
 *
 * Android refuses a file:// URI to another app, so the package goes out through
 * this app's FileProvider (declared in the module manifest, authority
 * `${applicationId}.fileprovider`). The installer also needs the
 * REQUEST_INSTALL_PACKAGES permission, and on Android 8 and later the user has
 * to allow this app as an install source once -- canRequestPackageInstalls()
 * answers whether that has happened, and when it has not we open that exact
 * settings screen instead of throwing an opaque ActivityNotFoundException.
 *
 * Kept in the module rather than a config plugin so `expo prebuild` regenerating
 * android/ cannot drop it.
 */
class NouApkInstaller(private val context: Context) {
  /** True when this app may start the installer without sending the user to settings. */
  fun canInstall(): Boolean = context.packageManager.canRequestPackageInstalls()

  /** Opens the per-app "install unknown apps" screen. Nothing to await: the user
   *  leaves and may or may not come back with the switch on. */
  fun openInstallSettings() {
    val intent = Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
      data = Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  /** Starts the package installer for `path`. Returns false when the install
   *  source is still blocked, which the caller turns into openInstallSettings. */
  fun install(path: String): Boolean {
    val file = File(path)
    if (!file.isFile) {
      throw Exception("No downloaded package at $path")
    }
    if (!canInstall()) {
      return false
    }
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", file)
    val intent = Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(uri, "application/vnd.android.package-archive")
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
    return true
  }
}
