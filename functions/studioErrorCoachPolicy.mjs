// Shared, credential-free contract. Never import the server handler in the web app.
import { diagnoseLocalError } from './studioErrorCoachLocal.mjs'
import { makeStructurePayload, validateStructurePayload } from './studioCoachStructure.mjs'
export const COACH_VERSION = 2
export const COACH_MODEL = 'gpt-5.6-luna'
export const ERROR_TYPES = ['SyntaxError', 'IndentationError', 'TabError', 'NameError', 'UnboundLocalError', 'TypeError', 'ValueError', 'IndexError', 'KeyError', 'ZeroDivisionError', 'FileNotFoundError', 'ModuleNotFoundError', 'ImportError', 'AttributeError', 'RuntimeError', 'Error']

export function parseError(text) {
  const lines = String(text || '').split('\n')
  const last = [...lines].reverse().find(line => /^(?:\w*(?:Error|Exception)|pygame\.error)(?::|$)/.test(line.trim()))?.trim() || ''
  const rawType = last.split(':')[0], type = ERROR_TYPES.includes(rawType) ? rawType : 'Error'
  const frames = [...String(text).matchAll(/File "\/tmp\/studio\/([^"\n]+)", line (\d+)/g)]
  const frame = frames.at(-1)
  return { type, message: last, path: frame?.[1] || '', line: frame ? Number(frame[2]) : 0, sameFileFrames: frame ? frames.filter(item => item[1] === frame[1]).length : 0, eligible: Boolean(last && frame) }
}
export const makeCoachPayload = makeStructurePayload
export const validateCoachPayload = validateStructurePayload

const guides = {
  SyntaxError: ['이 줄의 문법을 아직 정확히 구분하지 못했어요.', '자세한 오류 보기에서 ^ 표시가 가리키는 부분을 찾아, 수업 예시의 같은 문장과 비교해 주세요.', '오류 표시 바로 앞이나 윗줄에서 시작한 문장이 끝났는지도 살펴보세요. 원인을 단정하기 어려우면 해당 줄을 선생님과 함께 확인해요.'],
  IndentationError: ['들여쓰기의 위치를 확인해 볼까요?', 'if, for, def 안에서 실행할 줄이 같은 깊이로 들어가 있는지 살펴보세요.', '같은 묶음의 줄을 맞추고 다시 실행해 보세요. 보통 공백 4칸을 사용해요.'],
  NameError: ['파이썬이 이 이름을 아직 찾지 못했어요.', '오류에 나온 이름과 변수를 만든 곳의 철자·대소문자를 비교해 보세요.', '값을 먼저 만들었는지도 확인해 보세요. 노트북이라면 변수를 만든 셀부터 실행해야 해요.'],
  UnboundLocalError: ['함수 안에서 아직 값이 정해지지 않은 이름을 사용했어요.', '이 함수에서 그 이름에 처음 값을 넣는 줄을 찾아보세요.', '조건문을 건너뛰어도 값이 준비되는지 확인해 보세요. 함수 밖 변수와 이름이 같은지도 살펴보세요.'],
  TypeError: ['값의 종류와 사용 방법이 서로 맞지 않을 수 있어요.', '문제가 된 값의 type()을 출력해 보세요. 글자, 숫자, 함수 중 무엇인가요?', '숫자 계산에는 숫자가 필요해요. 괄호로 호출한 이름이 함수나 클래스인지도 확인해 보세요.'],
  ValueError: ['값의 종류는 맞아도, 내용이나 개수가 맞지 않을 수 있어요.', 'int()에 넣은 글자가 숫자인지, 나눠 담는 값의 개수가 맞는지 살펴보세요.', '오류 바로 앞에서 실제 값을 출력하고 예상한 값과 비교해 보세요.'],
  IndexError: ['목록에 없는 위치를 꺼내려고 했어요.', 'len(목록)으로 개수를 확인해 보세요. 첫 번째 위치는 0이에요.', '길이가 3이면 위치는 0, 1, 2예요. 반복문의 마지막 위치를 확인해 보세요.'],
  KeyError: ['딕셔너리나 표에서 요청한 이름을 찾지 못했어요.', '딕셔너리는 keys(), pandas 표는 columns를 출력해 이름을 비교해 보세요.', '띄어쓰기와 대소문자도 이름의 일부예요. 파일의 첫 줄도 확인해 보세요.'],
  ZeroDivisionError: ['0으로 나누는 계산에서 멈췄어요.', '나누기(/, //, %) 오른쪽의 값이 어떻게 0이 되었는지 찾아보세요.', '값이 0일 때 어떤 결과를 내고 싶은지 먼저 정한 뒤 조건문으로 나눠 보세요.'],
  FileNotFoundError: ['읽으려는 파일을 찾지 못했어요.', '왼쪽 파일 목록과 코드에 적은 경로를 비교해 보세요.', '폴더 이름·확장자·대소문자를 확인해 보세요. 내 컴퓨터의 파일은 스튜디오에도 올려야 해요.'],
  ModuleNotFoundError: ['불러오려는 모듈을 찾지 못했어요.', 'import 뒤 이름의 철자를 확인해 보세요.', '코드 스튜디오가 지원하지 않는 모듈일 수도 있어요. 설치를 반복하기 전에 선생님과 확인해 보세요.'],
  ImportError: ['모듈 안에서 불러올 이름을 확인해야 해요.', 'from 뒤 모듈과 import 뒤 이름이 올바른 조합인지 살펴보세요.', '거북이 수업에서는 from ColabTurtlePlus.Turtle import * 형태를 확인해 보세요.'],
  AttributeError: ['이 객체에는 요청한 기능이나 속성이 없어요.', '점(.) 앞 객체의 type()과 점 뒤 이름의 철자를 확인해 보세요.', '자동 추천 목록에서 이 객체가 제공하는 기능을 찾아보세요.'],
  RuntimeError: ['실행 중에 계속 진행하기 어려운 상황이 생겼어요.', '마지막 오류 문장에서 멈춘 이유를 먼저 찾아보세요.', '반복문이 화면을 멈췄다면 정지 후 선생님께 해당 반복문을 보여주세요. 코드 스튜디오의 실행 제한일 수도 있어요.'],
  Error: ['어디서 멈췄는지 함께 살펴볼까요?', '오류의 마지막 문장과 표시된 줄을 확인해 보세요.', '바로 앞에서 사용한 값을 출력해 보고, 예상했던 값과 비교해 보세요.']
}
export function localGuide(error) { return guides[error.type === 'TabError' ? 'IndentationError' : error.type] || guides.Error }
export function localFeedback(error, source, mode) {
  return diagnoseLocalError(error, source, mode) || { guide: localGuide(error), example: '', specific: false }
}
