import '@testing-library/jest-dom/extend-expect'
import { TextDecoder, TextEncoder } from 'util'

process.env.NEXT_PUBLIC_APP_URL = 'https://turkce-sozluk.com'

global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder
global.structuredClone ??= (value) => JSON.parse(JSON.stringify(value))
