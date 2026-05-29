package main

import (
	"regexp"
	"sort"
)

type keywordMatch struct {
	Keyword  string `json:"keyword"`
	Category string `json:"category"`
}

type keywordStat struct {
	Keyword  string `json:"keyword"`
	Category string `json:"category"`
	Count    int    `json:"count"`
}

type keywordDefinition struct {
	Keyword  string
	Category string
	Patterns []*regexp.Regexp
}

var keywordDictionary = []keywordDefinition{
	newKeywordDefinition("Go", "language", `(?i)\bgolang\b`, `(?i)\bgo\b`, `go\s*语言`),
	newKeywordDefinition("Java", "language", `(?i)\bjava\b`),
	newKeywordDefinition("Python", "language", `(?i)\bpython\b`),
	newKeywordDefinition("JavaScript", "language", `(?i)\bjavascript\b`, `(?i)\bjs\b`),
	newKeywordDefinition("TypeScript", "language", `(?i)\btypescript\b`, `(?i)\bts\b`),

	newKeywordDefinition("Gin", "backend", `(?i)\bgin\b`),
	newKeywordDefinition("go-zero", "backend", `(?i)\bgo-zero\b`, `(?i)\bgozero\b`),
	newKeywordDefinition("REST API", "backend", `(?i)\brest\s*api\b`, `(?i)\brestful\b`),
	newKeywordDefinition("gRPC", "backend", `(?i)\bgrpc\b`, `(?i)\brpc\b`),

	newKeywordDefinition("MySQL", "database", `(?i)\bmysql\b`),
	newKeywordDefinition("PostgreSQL", "database", `(?i)\bpostgresql\b`, `(?i)\bpostgres\b`),
	newKeywordDefinition("SQLite", "database", `(?i)\bsqlite\b`),
	newKeywordDefinition("MongoDB", "database", `(?i)\bmongodb\b`, `(?i)\bmongo\b`),
	newKeywordDefinition("Redis", "cache", `(?i)\bredis\b`, `缓存`),

	newKeywordDefinition("Kafka", "middleware", `(?i)\bkafka\b`),
	newKeywordDefinition("RabbitMQ", "middleware", `(?i)\brabbitmq\b`),
	newKeywordDefinition("NATS", "middleware", `(?i)\bnats\b`),
	newKeywordDefinition("消息队列", "middleware", `消息队列`),

	newKeywordDefinition("Docker", "devops", `(?i)\bdocker\b`, `容器化`),
	newKeywordDefinition("Kubernetes", "devops", `(?i)\bkubernetes\b`, `(?i)\bk8s\b`),
	newKeywordDefinition("Linux", "devops", `(?i)\blinux\b`, `(?i)\bshell\b`),
	newKeywordDefinition("Git", "devops", `(?i)\bgit\b`),
	newKeywordDefinition("CI/CD", "devops", `(?i)\bgithub\s+actions\b`, `(?i)\bci/cd\b`, `(?i)\bcicd\b`),

	newKeywordDefinition("HTTP", "network", `(?i)\bhttp\b`, `(?i)\bhttps\b`),
	newKeywordDefinition("TCP/IP", "network", `(?i)\btcp\b`, `(?i)\budp\b`),
	newKeywordDefinition("WebSocket", "network", `(?i)\bwebsocket\b`),
	newKeywordDefinition("数据结构与算法", "fundamentals", `数据结构`, `算法`),

	newKeywordDefinition("goroutine", "concurrency", `(?i)\bgoroutine\b`, `协程`),
	newKeywordDefinition("channel", "concurrency", `(?i)\bchannel\b`),
	newKeywordDefinition("并发", "concurrency", `并发`),
	newKeywordDefinition("微服务", "system", `微服务`),
	newKeywordDefinition("分布式", "system", `分布式`),

	newKeywordDefinition("LLM", "ai", `(?i)\bllm\b`, `大模型`, `(?i)\bai\s+agent\b`, `(?i)\bagent\b`),
	newKeywordDefinition("AI API", "ai", `(?i)\bopenai\s+api\b`, `API\s*调用`),
}

func newKeywordDefinition(keyword string, category string, patterns ...string) keywordDefinition {
	definition := keywordDefinition{
		Keyword:  keyword,
		Category: category,
		Patterns: make([]*regexp.Regexp, 0, len(patterns)),
	}

	for _, pattern := range patterns {
		definition.Patterns = append(definition.Patterns, regexp.MustCompile(pattern))
	}

	return definition
}

func extractKeywords(text string) []keywordMatch {
	matches := make([]keywordMatch, 0)
	seen := make(map[string]bool)

	for _, definition := range keywordDictionary {
		for _, pattern := range definition.Patterns {
			if pattern.MatchString(text) {
				if !seen[definition.Keyword] {
					matches = append(matches, keywordMatch{
						Keyword:  definition.Keyword,
						Category: definition.Category,
					})
					seen[definition.Keyword] = true
				}
				break
			}
		}
	}

	sort.Slice(matches, func(i, j int) bool {
		if matches[i].Category == matches[j].Category {
			return matches[i].Keyword < matches[j].Keyword
		}
		return matches[i].Category < matches[j].Category
	})

	return matches
}
