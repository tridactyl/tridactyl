type Mode = 'normal' | 'ignore' | 'pending' | 'hint'

class PageState {
    exstr: string
    mode: Mode
}

export default PageState