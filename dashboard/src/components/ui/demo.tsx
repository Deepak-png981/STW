import { HandWrittenTitle } from "./hand-writing-text"
import { NotFoundPage } from "@/components/ui/404-page-not-found"

function HandWrittenTitleDemo() {
    return <HandWrittenTitle title="Shame The Web" subtitle="Performance coach for your browser" />
}

export function PageNotFoundDemo(){
    return (
       <div className="w-full">
        <NotFoundPage/>
        </div>
    )
}

export { HandWrittenTitleDemo };