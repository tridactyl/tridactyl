import * as Completions from "@src/completions"
import { ExcmdCompletionOption } from "@src/completions/Excmd"
import glossary from "@src/.glossary.generated.json"

export function glossaryOptions(createOption, query: string, prefix: boolean) {
    const needle = query.toLowerCase()
    return glossary
        .filter(entry =>
            prefix
                ? entry.word.toLowerCase().startsWith(needle)
                : (entry.word + entry.definition)
                      .toLowerCase()
                      .includes(needle),
        )
        .map(entry =>
            createOption(entry.word, `Glossary. ${entry.definition}`, "-g"),
        )
}

export class GlossaryCompletionSource extends Completions.CompletionSourceFuse {
    public options: ExcmdCompletionOption[]

    constructor(parent) {
        super(["define"], "GlossaryCompletionSource", "Glossary")
        this.options = glossary.map(
            entry => new ExcmdCompletionOption(entry.word, entry.definition),
        )
        this.sortScoredOptions = true
        parent.appendChild(this.node)
    }
}
