Unicode true
Name "savingsOS"
OutFile "${RELEASE_DIR}\savingsOS-${VERSION}-windows-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\savingsOS"
RequestExecutionLevel user
SetCompressor /SOLID lzma
Page directory
Page instfiles
UninstPage uninstConfirm
UninstPage instfiles
Section "savingsOS"
  SetOutPath "$INSTDIR"
  File /oname=savingsOS.exe "${RELEASE_DIR}\savingsOS-${VERSION}-windows-x64-portable.exe"
  CreateShortcut "$DESKTOP\savingsOS.lnk" "$INSTDIR\savingsOS.exe" "--installed"
  CreateDirectory "$SMPROGRAMS\savingsOS"
  CreateShortcut "$SMPROGRAMS\savingsOS\savingsOS.lnk" "$INSTDIR\savingsOS.exe" "--installed"
  WriteUninstaller "$INSTDIR\Uninstall.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\savingsOS" "DisplayName" "savingsOS"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\savingsOS" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\savingsOS" "UninstallString" '"$INSTDIR\Uninstall.exe"'
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\savingsOS.lnk"
  Delete "$SMPROGRAMS\savingsOS\savingsOS.lnk"
  RMDir "$SMPROGRAMS\savingsOS"
  Delete "$INSTDIR\savingsOS.exe"
  Delete "$INSTDIR\Uninstall.exe"
  RMDir "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\savingsOS"
  ; Private records in APPDATA are deliberately retained.
SectionEnd
