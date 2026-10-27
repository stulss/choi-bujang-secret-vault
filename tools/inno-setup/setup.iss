; Inno Setup 6 Script for 케셰브 (Keshev) ZTNA & XDR 보안 Agent
; 포장 형태: 기본 포장 뒤 Inno Setup 설치 프로그램 (setup.exe, 사용자 단위 설치)

#define MyAppName "케셰브 (Keshev)"
#define MyAppVersion "1.0.0-rc1"
#define MyAppPublisher "ALEPH Defense Student"
#define MyAppURL "https://github.com/stulss/choi-bujang-secret-vault"
#define MyAppExeName "start-keshev.cmd"

[Setup]
AppId={{E731B68E-98A2-4D39-A457-36B690A87E52}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; 사용자 단위 설치: 관리자 권한 UAC를 요구하지 않고 %LOCALAPPDATA%에 설치
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
DefaultDirName={localappdata}\Programs\Keshev
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes
OutputBaseFilename=setup
OutputDir=..\..\dist-installer
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "korean"; MessagesFile: "compiler:Languages\Korean.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; on-client 폴더의 소스 및 정적 자산 복사
Source: "..\..\on-client\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*,*.log,*.tmp"
; 원클릭 런처 배치 스크립트
Source: "start-keshev.cmd"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{#MyAppName} (예제 모드)"; Filename: "{app}\{#MyAppExeName}"; Parameters: "--demo"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall nowait skipifsilent
