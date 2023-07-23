## Steps to setup GO CI on Windows

1. Open the `Powershell` as admin
2. install `chocolatey` by running the command

`Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))`

3. install `go` by running the command `choco install golang`
4. install `kind` by running the command `choco install kind`
5. run the command `kind create cluster` , check installation with `kubectl get pods -A`
6. create a new directory for your first Go file
7. inside create a git repo using `git init`
8. create a file `main.go` & paste in:

```go
package main

import "fmt"

func main() {
fmt.Println("hello world")
}
```

9. run the command `go mod init`
10. Install Visual Studio Code (VSC)
11. Install the VSC extension **Go** by **Go Team at Google go.dev**
12. Install any missing Go dependencies that show up there
13. Inside VSC open the terminal and run `go run main.go`, it should print "hello world" to the console
14. create `.github/workflows` directories and inside the `build.yaml` file with the following content

```yaml
name: go-build

on:
  pull_request:
  push:

jobs:
  build:
    runs-on: ${{ matrix.platform }}
    strategy:
      matrix:
        include:
          - platform: ubuntu-latest

    name: Build ${{ join(matrix.platform, ',') }} cloudflared-controller
    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Set up Go
        uses: actions/setup-go@v3
        with:
          go-version: 1.19

      - name: Create k8s Kind Cluster
        uses: helm/kind-action@v1.5.0

      - name: Build
        run: go build -v ./...

      - name: Test
        run: go test -v ./...

      - name: Docker Login
        #if: startsWith(github.ref, 'refs/tags/v')
        uses: docker/login-action@v2
        with:
          registry: ghcr.io
          username: ${{ github.repository_owner }}
          password: ${{ secrets.GITHUB_TOKEN  }}

      - name: Run GoReleaser
        uses: goreleaser/goreleaser-action@v4
        if: startsWith(github.ref, 'refs/tags/v')
        with:
          version: latest
          args: release --clean
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Also add the `.goreleaser.yml` file in your project root directory with the following content

```yaml
before:
  hooks:
    - go mod download
builds:
  - env:
      - CGO_ENABLED=0
    id: "go-helloworld"
    ldflags:
      - "-s -w -X main.Version='{{.Version}}' -X main.GitCommit={{.Commit}}"
    #      - freebsd
    goos:
      - linux
    #      - windows
    #      - darwin
    goarch:
      - amd64
      - arm64
      #- arm
      #    goarm:
      #- 6
      #- 7
    main: ./main.go
    binary: main
    tags:
      - release

archives:
  - id: archive_id
    name_template: >-
      {{ .ProjectName }}_
      {{- .Version }}_
      {{- title .Os }}_
      {{- if eq .Arch "amd64" }}x86_64
      {{- else if eq .Arch "386" }}i386
      {{- else }}{{ .Arch }}{{ end }}
      {{- .Arm }}

checksum:
  name_template: "checksums.txt"
snapshot:
  name_template: "{{ .Tag }}-next"
changelog:
  sort: asc
  filters:
    exclude:
      - "^docs:"
      - "^test:"

# .goreleaser.yaml
dockers:
  - image_templates:
      ["ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-amd64"]
    use: buildx
    dockerfile: Dockerfile
    goarch: amd64
    build_flag_templates:
      - --platform=linux/amd64
      - --label=org.opencontainers.image.title={{ .ProjectName }}
      - --label=org.opencontainers.image.description={{ .ProjectName }}
      - --label=org.opencontainers.image.url=https://github.com/{{ .Repo }}/{{ .ProjectName }}
      - --label=org.opencontainers.image.source=https://github.com/{{ .Repo }}/{{ .ProjectName }}
      - --label=org.opencontainers.image.version={{ .Version }}
      - --label=org.opencontainers.image.created={{ .CommitTimestamp }}
      - --label=org.opencontainers.image.revision={{ .FullCommit }}
      - --label=org.opencontainers.image.licenses=APL2

  - image_templates:
      ["ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-arm64v8"]
    dockerfile: Dockerfile
    use: buildx
    goarch: arm64
    build_flag_templates:
      - --platform=linux/arm64/v8
      - --label=org.opencontainers.image.title={{ .ProjectName }}
      - --label=org.opencontainers.image.description={{ .ProjectName }}
      - --label=org.opencontainers.image.url=https://github.com/{{ .Repo }}/{{ .ProjectName }}
      - --label=org.opencontainers.image.source=https://github.com/{{ .Repo }}/{{ .ProjectName }}
      - --label=org.opencontainers.image.version={{ .Version }}
      - --label=org.opencontainers.image.created={{ .CommitTimestamp }}
      - --label=org.opencontainers.image.revision={{ .FullCommit }}
      - --label=org.opencontainers.image.licenses=APL2

docker_manifests:
  - name_template: ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}
    image_templates:
      - ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-amd64
        #  - ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-armv7
      - ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-arm64v8
  - name_template: ghcr.io/{{ .Repo }}/{{ .ProjectName }}:latest
    image_templates:
      - ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-amd64
        #  - ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-armv7
      - ghcr.io/{{ .Repo }}/{{ .ProjectName }}:{{ .Version }}-arm64v8
```

And the `Dockerfile` with the following content:

```yaml
FROM alpine:latest

COPY . .

ENTRYPOINT ["./main"]
```

15. commit your local changes
16. add a tag to your commit starting with a "v" like this `git tag v0.0.1`
17. push your commit to the repo and afterwards run `git push v0.0.1`
18. After a successful build run, you should now have a published Release.
19. Create a Personal Access Token (PAT) for your github Account, via [Settings -> Developer Settings -> Personal Access Token](https://github.com/settings/tokens)
    with the Permissions:

- repo (all)
- write:packages
- read:packages

20. Navigate to your local commandline and use the following command to log in:
    `docker login ghcr.io -u USERNAME` with your Github username as USERNAME
    and enter your PAT as password
21. click the Code tab at the top of your github repository. Then, find the navigation bar below the repository description, and click the `Packages` link. Thhere you will find a docker pull command for your image that looks like this `docker pull ghcr.io/{{ .Repo }}/go-ci-helloworld:latest`
22. Run it locally in your commandline. You should see output indicating that the pull was successful.
23. Run your Docker image with the command `docker run -ti ghcr.io/{{ .Repo }}/go-ci-helloworld:latest`
    The output should be `hello world`
