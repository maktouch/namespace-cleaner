import { CoreV1Api, KubeConfig } from "@kubernetes/client-node";
import Bluebird from "bluebird";
import { Octokit } from "octokit";
import { blacklist, github, namespace_regex, k8screds } from "./config";

const octokit = new Octokit({ auth: github.token });

function getK8s() {
  const kc = new KubeConfig();

  if (k8screds) {
    kc.loadFromString(k8screds);
  } else {
    kc.loadFromDefault();
  }

  return kc.makeApiClient(CoreV1Api);
}

async function getPR() {
  const results = await octokit.rest.pulls.list({
    owner: github.owner,
    repo: github.repository,
  });

  return results.data.map((pr) => pr.number);
}

async function getNamespace() {
  const k8s = getK8s();
  const res = await k8s.listNamespace();

  return res.body.items.map((ns) => {
    return ns.metadata?.name ?? "";
  });
}

async function deleteNamespaces(namespaces: string[]) {
  if (namespaces.length === 0) {
    console.log("No namespaces to delete. Exiting...");
    return;
  }

  const k8s = getK8s();

  await Bluebird.map(
    namespaces,
    async (ns) => {
      console.log(`Deleting namespace ${ns}...`);
      await k8s.deleteNamespace(ns);
    },
    { concurrency: 2 }
  );
}

async function main() {
  const pr = await getPR();
  const namespaces = await getNamespace();

  const regex = new RegExp(namespace_regex, "m");

  const namespacesToClean = namespaces.filter((ns) => {
    // check if the namespace is a valid pr-namespace
    // this will ignore non-pr namespaces like kube-system, ops, default.
    if (!regex.test(ns)) {
      return false;
    }

    // some namespace might be blacklisted to be ignored, like rev-master
    if (blacklist.includes(ns)) {
      return false;
    }

    const match = regex.exec(ns);

    // should never happen but typescript is complaining
    if (!match) {
      return false;
    }

    // if the namespace is a valid pr-namespace, check if the pr is still open
    if (pr.includes(Number(match[1]))) {
      return false;
    }

    return true;
  });

  // delete all the namespaces that are not valid anymore
  await deleteNamespaces(namespacesToClean);
}

main();
