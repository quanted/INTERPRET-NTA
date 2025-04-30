console.log("pulling from this script")


function getQueryParam(key){
    const params = new URLSearchParams(window.location.search);
    return params.get(key)
}

document.addEventListener("DOMContentLoaded", () => {
    const DTXCID = getQueryParam("dtxcid")
    if (DTXCID){
        document.body.insertAdjacentHTML("beforeend", `<p>FUTURE: mirror plot for ${DTXCID} will appear here</p>`)
    }
})