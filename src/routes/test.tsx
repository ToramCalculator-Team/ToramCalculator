import Button from "~/components/controls/button";
import { authOpts } from "./api/auth/[...solidauth]"
import { signIn } from "@auth/solid-start/client"


export default function test() {
    return (
        <Button onClick={() => signIn()}>
            SignIn
        </Button>
    )
}