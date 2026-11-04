@echo off
REM NeoTube Android build helper: rebuilds the injected content script, then
REM calls Gradle. Needs a JDK (JAVA_HOME) and an Android SDK (ANDROID_HOME or
REM android/local.properties); both are detected from the usual install
REM locations when they are not set.
REM
REM assets/scripts/main.bjs is generated and gradle does not build it, so a
REM stale bundle would ship old content-script code. Rebuild it first.
setlocal
cd /d "%~dp0neotube"
if errorlevel 1 (
  echo Cannot find "%~dp0neotube"
  exit /b 1
)
call bun run bundle
if errorlevel 1 exit /b 1

if not defined JAVA_HOME if exist "C:\Program Files\Android\Android Studio\jbr" set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined ANDROID_SDK_ROOT if defined ANDROID_HOME set "ANDROID_SDK_ROOT=%ANDROID_HOME%"

REM Prefer a Gradle distribution that is already on disk (the wrapper cannot
REM always reach services.gradle.org); the dist directory hash is derived from
REM the distribution URL, so this path is the same on every machine.
set "CACHED_GRADLE=%USERPROFILE%\.gradle\wrapper\dists\gradle-9.3.1-all\9ot9r568e8zfvvd4mn8rbu1j0\gradle-9.3.1\bin\gradle.bat"
if not defined GRADLE_BIN if exist "%CACHED_GRADLE%" set "GRADLE_BIN=%CACHED_GRADLE%"

cd /d "%~dp0neotube\android"
if not defined GRADLE_BIN set "GRADLE_BIN=%~dp0neotube\android\gradlew.bat"
call "%GRADLE_BIN%" %*

