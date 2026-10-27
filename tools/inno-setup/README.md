# 케셰브 (Keshev) Inno Setup 설치 프로그램 패키징

사용자가 선택한 포장 형태인 **기본 포장 뒤 Inno Setup 설치 프로그램 (`setup.exe`, 사용자 단위 설치)** 정의 자료입니다.

---

## 1. 특징
- **사용자 단위 설치 (`PrivilegesRequired=lowest`)**: 관리자 UAC 권한 창 없이 일반 사용자 권한으로 `%LOCALAPPDATA%\Programs\Keshev`에 안전하게 설치됩니다.
- **바탕화면 및 시작 메뉴 바로가기**:
  - `케셰브 (Keshev)`: 기본 모드 실행 바로가기
  - `케셰브 (Keshev) (예제 모드)`: 모의 관제 대시보드 바로가기
- **간편 제거 지원**: 제어판 '프로그램 추가/제거' 및 시작 메뉴 언인스톨러 등록.

---

## 2. Inno Setup 컴파일러(ISCC)로 setup.exe 빌드 방법

Windows PC에 [Inno Setup 6](https://jrsoftware.org/isdl.php)가 설치되어 있는 경우, PowerShell에서 아래 한 줄로 컴파일합니다:

```powershell
# Inno Setup 컴파일 명령 실행 (기본 설치 경로 기준)
& "C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "tools\inno-setup\setup.iss"
```

- **정상 결과**:
  - `dist-installer\setup.exe` 파일이 생성됨 (약 1~2MB 내외의 단일 설치 파일).
- **거부 / 오류 결과**:
  - Inno Setup이 설치되지 않았거나 경로가 다르면 `CommandNotFoundException` 출력.

---

## 3. 설치 프로그램 실행 및 검증 순서

1. 생성된 `dist-installer\setup.exe`를 실행합니다.
2. 설치 마법사에서 설치 경로(`%LOCALAPPDATA%\Programs\Keshev`)를 확인하고 [다음]을 누릅니다.
3. 설치 완료 후 생성된 시작 메뉴 바로가기(`케셰브 (Keshev)`) 또는 바탕화면 아이콘을 클릭합니다.
4. 브라우저에서 `http://127.0.0.1:5189/`이 자동으로 열리며 관제 대시보드가 구동되는 것을 확인합니다.
