/*import { Octokit } from './node_modules/@octokit/rest/dist-web/index.js';

console.log(Octokit);*/

const client_id = "2b4ed9ba835b05f83e2d";
const destination = "https://daktary-team.github.io/scribouilli";
const redirect_url = "https://file-moi-les-clefs.herokuapp.com/gh-callback";

const githubLogin = document.querySelector("#github-login");
githubLogin.href = `https://github.com/login/oauth/authorize?client_id=${client_id}&scope=public_repo&redirect_uri=${redirect_url}?destination=${destination}`;

const accessToken = new URL(location).searchParams.get("access_token");

if (accessToken) {
    console.log("connecté t'as vu");
    location.href = "#create-project";

    d3.json("https://api.github.com/user", {headers: {Authorization: "token " + accessToken}})
        .then(result => {
            console.log(result);
            const login = result.login;
            const origin = `${login}.github.io`
            const originElement = document.querySelector("#create-project .origin");
            originElement.textContent = origin;
            return origin;
        })
        .then((origin) => {
            const repoName = origin; // per Github pages convention
            const publishedWebsiteURL = `https://${repoName}/`;
            const button = document.querySelector("#create-project .submit");
            button.addEventListener("click", () => {
                d3.json("https://api.github.com/user/repos", {
                    headers: {Authorization: "token " + accessToken},
                    method: "POST",
                    body: JSON.stringify(
                        {
                            name: repoName,
                            homepage: publishedWebsiteURL,
                            has_issues: false,
                            has_projects: false,
                            has_wiki: false,
                            auto_init: false
                        }
                    )
                })
            })
        })
} else {
    console.log("bonjoir");
    location.href = "#welcome";
}
