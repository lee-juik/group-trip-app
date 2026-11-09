# 우리끼리 여행 (그룹 여행 계획 앱)

친구들과 가고 싶은 곳을 모으고, 비밀 투표로 정하고, 날짜별 일정표로 정리하는 앱.
웹앱(PWA)으로 배포되어 아이폰·안드로이드에서 "홈 화면에 추가"해서 앱처럼 쓴다.

- 배포 주소: https://lee-juik.github.io/group-trip-app/ (`main`에 올리면 GitHub Actions가 자동 배포)
- 백엔드: Supabase (익명 로그인, RLS, 실시간 구독). 프로젝트 `wtothatrncfccghnswny`
- 초대: 6자리 코드 또는 `?code=XXXXXX` 링크. 같은 이름으로 다시 들어오면 내 자리를 이어받는다.

## 화면
- **모아보기**: 가고 싶은 곳 카드를 직접 등록(이름·동네·링크·메모·종류). 같은 이름은 자동으로 합치고 "가고 싶다(하트)" 수로 정렬.
  카드를 누르면 메모 전체·구글맵·링크·수정·지우기.
- **투표**: 모아보기 후보로 비밀 투표. 결과는 전원 투표 또는 마감 때만 공개(서버가 숨겨서 보관). 과반수로 결정, 과반이 없으면 상위 2개로 재투표.
- **일정**: 날짜별 일정표에 항공편과 일정을 넣고, 일정 사이 이동(노선·시간)을 표시. 동선 정리(가까운 순서로 재배치), 구글맵 경로 보기.
  일정을 누르면 시간·이름·메모를 고친다.
- **수다**: 여행방 단톡. 읽음 표시, 실패한 메시지 눌러서 다시 보내기.

## 구조
```
App.tsx                 탭 셸, 여행방 시트(초대 코드, 멤버, 입장 잠금), 오프라인 배너, 글꼴 로딩, 오류 경계
src/store.tsx           상태(reducer) + 서버 반영(sendToServer) + 세션(TripProvider). 화면 먼저 바꾸고 서버에 저장 뒤 다시 읽음
src/lib/remote.ts       Supabase 읽기/구독/RPC
src/lib/chat.ts         수다방 (실시간 + 포커스/온라인/재연결 시 다시 읽기)
src/lib/supabase.ts     클라이언트, 익명 로그인
src/lib/util.ts         uuid, 시간 정리(normTime), 친절한 오류 문구, 확인창, 구글맵 좌표 추출
src/lib/route.ts        동선 최적화, 경로 링크
src/screens/*           모아보기 / 투표 / 일정 / 수다 / 시작 화면
src/components/*        시트, 버튼, 필드, 탭바, 탑승권 등
src/fonts.ts(.web.ts)   글꼴: 앱은 TTF, 웹은 한글 서브셋 woff2(0.6MB)
src/data/sample.ts      샘플 여행(데모 모드)
supabase/migrations/    DB 구조 백업(0001)과 보안 트리거(0002). 대시보드 SQL 편집기에서 그대로 실행 가능
supabase/functions/     remove-member (방장이 멤버 내보내기, service role)
```

## 데이터 보호 (Supabase)
- 모든 표에 RLS. `is_trip_member()`로 같은 여행방 멤버만 읽고 쓴다.
- 비밀투표: `ballots`는 본인 것만 읽을 수 있고, 집계는 `vote_status()` RPC가 공개 조건을 만족할 때만 돌려준다.
- 트리거 가드(0002): `votes`는 마감만, `members`는 이름만, `trips`는 RPC로만, `days`는 비행기 칸만 바꿀 수 있다.
  지운 장소/일정은 `trash` 표에 남는다(대시보드에서 복구).
- 방장은 "새 멤버 입장 막기"로 초대 코드가 새어 나가도 막을 수 있다.

## 실행
```bash
npm install
npx expo start --web          # 브라우저
npx expo start                # Expo Go
npm run typecheck             # 타입 검사 (배포 전 CI에서도 돌아감)
npm run build:web             # web/ 폴더로 정적 빌드
```
서버에 못 닿는 환경에서는 "샘플 여행 구경하기"(데모 모드)로 화면을 확인할 수 있다.

## 디자인
- 파스텔 감성: 주아·고운돋움 글꼴, 파스텔 카드, 둥근 떠 있는 탭바, 이모지 아이콘
- 애니메이션(Reanimated): 눌림 효과, 카드 순차 등장, 하트 튕김, 투표 막대, 탭 바운스, 햅틱
